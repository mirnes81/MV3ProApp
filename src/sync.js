import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

let Network = null;
try {
  // eslint-disable-next-line global-require
  Network = require('expo-network');
} catch (e) {
  Network = null;
}

/** Vrai si le téléphone est actuellement en Wi-Fi. */
async function surWifi() {
  if (!Network) return true; // module absent : on n'empêche rien
  try {
    const etat = await Network.getNetworkStateAsync();
    return etat.type === Network.NetworkStateType.WIFI;
  } catch (e) {
    return true;
  }
}

const CONFIG_KEY = 'mv3.sync.config.v1';
const STATE_KEY = 'mv3.sync.state.v1';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

export async function getSyncConfig() {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : { url: '', token: '' };
  } catch (e) {
    return { url: '', token: '' };
  }
}

export async function setSyncConfig(config) {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function getSyncState() {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : { since: 0, lastRun: null, lastError: null };
  } catch (e) {
    return { since: 0, lastRun: null, lastError: null };
  }
}

async function setSyncState(state) {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/** Efface le curseur pour forcer un rapatriement complet. */
export async function resetSyncCursor() {
  const state = await getSyncState();
  await setSyncState({ ...state, since: 0 });
}

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

/**
 * Envoie la requête de synchronisation.
 * On passe le jeton dans un en-tête maison en plus de Authorization :
 * certains hébergements mutualisés filtrent Authorization.
 */
function postSync(url, token, body) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.setRequestHeader('X-MV3-Token', token);
    xhr.timeout = 60000;

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error('Réponse illisible du serveur'));
        }
      } else if (xhr.status === 401) {
        reject(new Error('Jeton refusé. Vérifiez la valeur copiée depuis Dolibarr.'));
      } else if (xhr.status === 404) {
        reject(new Error("Adresse introuvable. Vérifiez l'URL de synchronisation."));
      } else {
        reject(new Error('Erreur serveur ' + xhr.status));
      }
    };
    xhr.ontimeout = () => reject(new Error('Délai dépassé. Connexion trop lente.'));
    xhr.onerror = () => reject(new Error('Serveur injoignable. Vérifiez la connexion.'));

    xhr.send(JSON.stringify(body));
  });
}

/* ------------------------------------------------------------------ */
/* Conversion entre le format local et le format serveur               */
/* ------------------------------------------------------------------ */

function taskToServer(t) {
  return {
    uuid: t.id,
    title: t.title || '',
    note: t.note || '',
    contact: t.contact || '',
    address: t.address || '',
    project_uuid: t.projectId || null,
    priority: t.priority || 2,
    done: t.done ? 1 : 0,
    due_date: t.dueDate || null,
    subtasks: (t.subtasks || []).map((s) => ({
      id: s.id,
      title: s.title,
      done: s.done ? 1 : 0,
    })),
    updated_at: t.updatedAt || Date.now(),
    deleted: t.deleted ? 1 : 0,
  };
}

function taskFromServer(r) {
  return {
    id: r.uuid,
    title: r.title || '',
    note: r.note || '',
    contact: r.contact || '',
    address: r.address || '',
    projectId: r.project_uuid || null,
    priority: r.priority || 2,
    done: !!r.done,
    dueDate: r.due_date || null,
    subtasks: (r.subtasks || []).map((s) => ({
      id: String(s.id),
      title: s.title || '',
      done: !!s.done,
    })),
    attachments: [],
    updatedAt: r.updated_at || 0,
    deleted: !!r.deleted,
    createdAt: r.updated_at || Date.now(),
  };
}

function projectToServer(p) {
  return {
    uuid: p.id,
    name: p.name || '',
    type: p.type || 'autre',
    address: p.address || '',
    updated_at: p.updatedAt || Date.now(),
    deleted: p.deleted ? 1 : 0,
  };
}

function projectFromServer(r) {
  return {
    id: r.uuid,
    name: r.name || '',
    type: r.type || 'autre',
    address: r.address || '',
    updatedAt: r.updated_at || 0,
    deleted: !!r.deleted,
  };
}

/* ------------------------------------------------------------------ */
/* Synchronisation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Effectue un cycle complet montée + descente.
 *
 * @param {object} local   { tasks, projects }
 * @returns {object} { ok, merged, message }
 */
export async function runSync(local, options = {}) {
  const config = await getSyncConfig();
  if (!config.url || !config.token) {
    return { ok: false, message: "Renseignez l'adresse et le jeton dans Synchronisation." };
  }

  const state = await getSyncState();
  const since = state.since || 0;

  // On ne remonte que ce qui a bougé depuis le dernier passage réussi.
  const changedTasks = local.tasks.filter((t) => (t.updatedAt || 0) > since);
  const changedProjects = local.projects.filter((p) => (p.updatedAt || 0) > since);

  // Pièces jointes : on peut les réserver au Wi-Fi pour économiser le forfait.
  const pendingFiles = [];
  let filesDeferred = 0;
  const wifiOk = options.wifiOnlyUpload ? await surWifi() : true;

  for (const task of local.tasks) {
    for (const att of task.attachments || []) {
      if (att.synced) continue;
      if (!wifiOk) { filesDeferred++; continue; }
      try {
        const content = await FileSystem.readAsStringAsync(att.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        pendingFiles.push({
          uuid: att.id,
          task_uuid: task.id,
          filename: att.name || 'photo.jpg',
          filepath: '',
          mimetype: att.mimetype || 'image/jpeg',
          content_b64: content,
          updated_at: Date.now(),
          deleted: 0,
        });
      } catch (e) {
        // Fichier absent du cache : on l'ignore sans bloquer la synchro.
      }
    }
  }

  let response;
  try {
    response = await postSync(config.url, config.token, {
      since,
      device: 'android',
      changes: {
        projects: changedProjects.map(projectToServer),
        tasks: changedTasks.map(taskToServer),
        files: pendingFiles,
      },
    });
  } catch (e) {
    await setSyncState({ ...state, lastError: e.message, lastRun: Date.now() });
    return { ok: false, message: e.message };
  }

  if (!response || !response.ok) {
    const msg = (response && response.error) || 'Réponse inattendue du serveur';
    await setSyncState({ ...state, lastError: msg, lastRun: Date.now() });
    return { ok: false, message: msg };
  }

  // Fusion : le serveur ne renvoie que ce qui est plus récent que `since`,
  // mais on re-arbitre localement au cas où une modification aurait eu lieu
  // pendant l'appel réseau.
  const merged = {
    tasks: mergeList(local.tasks, (response.changes.tasks || []).map(taskFromServer)),
    projects: mergeList(local.projects, (response.changes.projects || []).map(projectFromServer)),
  };

  // Marque les pièces jointes montées comme synchronisées.
  const uploaded = new Set(pendingFiles.map((f) => f.uuid));
  if (uploaded.size) {
    merged.tasks = merged.tasks.map((t) => ({
      ...t,
      attachments: (t.attachments || []).map((a) =>
        uploaded.has(a.id) ? { ...a, synced: true } : a
      ),
    }));
  }

  await setSyncState({
    since: response.now,
    lastRun: Date.now(),
    lastError: null,
  });

  const applied = response.applied || {};
  const up = (applied.inserted || 0) + (applied.updated || 0);
  const down = (response.changes.tasks || []).length + (response.changes.projects || []).length;

  let message = `Synchronisé. ${up} envoyé(s), ${down} reçu(s).`;
  if (filesDeferred > 0) {
    message += ` ${filesDeferred} photo(s) en attente de Wi-Fi.`;
  }

  return { ok: true, merged, message };
}

/**
 * Fusionne deux listes d'objets identifiés par `id`, en gardant la version
 * dont `updatedAt` est le plus récent. Les éléments marqués supprimés
 * disparaissent de la liste finale.
 */
function mergeList(localList, remoteList) {
  const byId = new Map();

  for (const item of localList) {
    byId.set(item.id, item);
  }

  for (const remote of remoteList) {
    const local = byId.get(remote.id);
    if (!local || (remote.updatedAt || 0) > (local.updatedAt || 0)) {
      byId.set(remote.id, remote);
    }
  }

  return [...byId.values()].filter((item) => !item.deleted);
}
