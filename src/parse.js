/**
 * Analyse une phrase dictée en français et en extrait une tâche structurée.
 *
 * Tout se fait sur le téléphone, sans réseau. La reconnaissance des projets
 * et des clients s'appuie sur vos données réelles : c'est ce qui permet de
 * comprendre « chez AZ Construction » là où un assistant générique échoue.
 *
 * Principe interne : la phrase est découpée en mots. La reconnaissance
 * travaille sur une copie normalisée (sans accents, en minuscules), mais le
 * titre final est reconstruit à partir des mots d'origine, ce qui préserve
 * les accents et les majuscules.
 */

const JOURS = {
  lundi: 1, mardi: 2, mercredi: 3, jeudi: 4,
  vendredi: 5, samedi: 6, dimanche: 0,
};

const MOIS = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

const MOTS_HAUTE = [
  'tres urgent', 'au plus vite', 'tout de suite', 'des que possible',
  'urgent', 'urgente', 'prioritaire', 'important', 'importante',
  'immediatement', 'critique',
];

const MOTS_BASSE = [
  'pas urgent', 'pas presse', 'plus tard', 'basse priorite',
  'quand j aurai le temps', 'si possible', 'peu importe',
];

const MOMENTS = [
  'cette apres-midi', 'cette apres midi', 'dans la journee', 'ce matin', 'cette matinee',
  'ce soir', 'cette soiree', 'a midi', 'ce midi', 'apres-midi', 'apres midi',
  'matin', 'matinee', 'soir', 'soiree', 'midi', 'journee',
];

/** Mots vides tolérés en fin ou en début de titre après extraction. */
const ORPHELINS = ['ce', 'cette', 'ces', 'le', 'la', 'les', 'du', 'de', 'des', 'a', 'au', 'aux', 'dans', 'pour', 'chez', 'sur', 'en'];

const PREPOSITIONS = ['chez', 'pour', 'au', 'a', 'sur', 'du', 'de', 'le', 'la', 'les', 'chantier'];

const AMORCES = [
  'ne pas oublier de', 'il faut', 'faut', 'je dois', 'penser a', 'noter de',
  'et', 'puis', 'alors', 'donc',
];

/** Retire accents et ponctuation, passe en minuscules. */
export function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalise un mot isolé, en conservant les points des dates chiffrées. */
function normalizeWord(word) {
  let w = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019']/g, '')
    .replace(/[,;:!?()"]/g, '');
  if (!/^\d/.test(w)) {
    w = w.replace(/\.+$/, '');
  }
  return w;
}

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/* ------------------------------------------------------------------ */
/* Mots vivants / mots consommés                                       */
/* ------------------------------------------------------------------ */

function makeText(original) {
  const tokens = (original || '').trim().split(/\s+/).filter(Boolean);
  return {
    tokens,
    norm: tokens.map(normalizeWord),
    alive: tokens.map(() => true),
  };
}

function aliveIndexes(t) {
  const out = [];
  for (let i = 0; i < t.tokens.length; i++) {
    if (t.alive[i]) out.push(i);
  }
  return out;
}

function aliveNorm(t) {
  return aliveIndexes(t).map((i) => t.norm[i]).join(' ');
}

function aliveText(t) {
  return aliveIndexes(t).map((i) => t.tokens[i]).join(' ');
}

/**
 * Consomme une expression normalisée. Renvoie l'intervalle retiré,
 * ou null si l'expression est absente.
 */
function consume(t, phrase) {
  const words = normalize(phrase).split(' ').filter(Boolean);
  if (!words.length) return null;

  const idx = aliveIndexes(t);
  const arr = idx.map((i) => t.norm[i]);

  for (let s = 0; s + words.length <= arr.length; s++) {
    let ok = true;
    for (let k = 0; k < words.length; k++) {
      if (arr[s + k] !== words[k]) { ok = false; break; }
    }
    if (ok) {
      for (let k = 0; k < words.length; k++) {
        t.alive[idx[s + k]] = false;
      }
      return { start: idx[s], end: idx[s + words.length - 1] };
    }
  }

  let touched = false;
  for (const w of words) {
    const j = idx.find((i) => t.alive[i] && t.norm[i] === w);
    if (j !== undefined) { t.alive[j] = false; touched = true; }
  }
  return touched ? { start: -1, end: -1 } : null;
}

/** Retire les prépositions orphelines juste avant un groupe consommé. */
function cleanAround(t, span) {
  if (!span || span.start < 0) return;
  for (let i = span.start - 1; i >= 0; i--) {
    if (!t.alive[i]) continue;
    if (PREPOSITIONS.includes(t.norm[i])) {
      t.alive[i] = false;
      continue;
    }
    break;
  }
}

/* ------------------------------------------------------------------ */
/* Extracteurs                                                         */
/* ------------------------------------------------------------------ */

function extractDate(t, today) {
  // Formes composées d'un seul tenant : « après-demain », « aujourd'hui »
  const composes = { 'apres-demain': 2, 'apres_demain': 2, 'aujourd-hui': 0 };
  for (const i of aliveIndexes(t)) {
    if (Object.prototype.hasOwnProperty.call(composes, t.norm[i])) {
      t.alive[i] = false;
      return toKey(addDays(today, composes[t.norm[i]]));
    }
  }

  const norm = aliveNorm(t);

  const relatives = [
    { re: /\bapres demain\b/, days: 2 },
    { re: /\bdemain\b/, days: 1 },
    { re: /\baujourd hui\b/, days: 0 },
    { re: /\bce jour\b/, days: 0 },
  ];
  for (const r of relatives) {
    const m = norm.match(r.re);
    if (m) {
      consume(t, m[0]);
      return toKey(addDays(today, r.days));
    }
  }

  let m = norm.match(/\bdans (\d+) (jours?|semaines?)\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    consume(t, m[0]);
    return toKey(addDays(today, m[2].indexOf('semaine') === 0 ? n * 7 : n));
  }

  m = norm.match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)( prochain)?\b/);
  if (m) {
    const cible = JOURS[m[1]];
    let delta = (cible - today.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    consume(t, m[0]);
    return toKey(addDays(today, delta));
  }

  m = norm.match(/\b(?:le )?(\d{1,2}) (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/);
  if (m) {
    const jour = parseInt(m[1], 10);
    const mois = MOIS[m[2]];
    let annee = today.getFullYear();
    if (new Date(annee, mois - 1, jour) < today) annee++;
    consume(t, m[0]);
    return `${annee}-${pad(mois)}-${pad(jour)}`;
  }

  m = norm.match(/\b(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?\b/);
  if (m) {
    const jour = parseInt(m[1], 10);
    const mois = parseInt(m[2], 10);
    if (jour >= 1 && jour <= 31 && mois >= 1 && mois <= 12) {
      let annee = m[3] ? parseInt(m[3], 10) : today.getFullYear();
      if (annee < 100) annee += 2000;
      if (!m[3] && new Date(annee, mois - 1, jour) < today) annee++;
      consume(t, m[0]);
      return `${annee}-${pad(mois)}-${pad(jour)}`;
    }
  }

  if (/\bfin de semaine\b/.test(norm)) {
    let delta = (5 - today.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    consume(t, 'fin de semaine');
    return toKey(addDays(today, delta));
  }

  return null;
}

function extractPriority(t) {
  const norm = aliveNorm(t);
  for (const mot of MOTS_BASSE) {
    if (norm.indexOf(mot) !== -1) { consume(t, mot); return 3; }
  }
  for (const mot of MOTS_HAUTE) {
    if (norm.indexOf(mot) !== -1) { consume(t, mot); return 1; }
  }
  return null;
}

function extractProject(t, projects) {
  const norm = aliveNorm(t);
  let best = null;

  for (const p of projects) {
    if (p.deleted) continue;
    const pname = normalize(p.name);
    if (pname.length < 3) continue;

    if (norm.indexOf(pname) !== -1) {
      const score = pname.length * 10;
      if (!best || score > best.score) best = { project: p, phrase: pname, score };
      continue;
    }

    const mots = pname.split(' ').filter((w) => w.length >= 4);
    if (!mots.length) continue;
    const presents = mots.filter((w) => norm.indexOf(w) !== -1);
    if (presents.length === mots.length) {
      const score = presents.join('').length * 4;
      if (!best || score > best.score) best = { project: p, phrase: presents.join(' '), score };
    }
  }

  if (!best) return null;
  const span = consume(t, best.phrase);
  cleanAround(t, span);
  return best.project;
}

function extractContact(t, contacts) {
  // 1. Un contact déjà connu, cité tel quel.
  for (const c of contacts) {
    const cn = normalize(c);
    if (cn.length >= 4 && aliveNorm(t).indexOf(cn) !== -1) {
      const span = consume(t, cn);
      cleanAround(t, span);
      return c;
    }
  }

  // 2. Repli : « chez X », où X n'est ni un moment de la journée ni un mot vide.
  const idx = aliveIndexes(t);
  const pos = idx.findIndex((i) => t.norm[i] === 'chez');
  if (pos >= 0 && pos + 1 < idx.length) {
    const suivants = [];
    for (let k = pos + 1; k < idx.length && suivants.length < 2; k++) {
      const w = t.norm[idx[k]];
      if (!/^[a-z0-9]+$/.test(w)) break;
      if (MOMENTS.indexOf(w) !== -1) break;
      if (w === 'ce' || w === 'cette') break;
      if (PREPOSITIONS.indexOf(w) !== -1) break;
      suivants.push(idx[k]);
    }
    if (suivants.length && t.norm[suivants[0]].length >= 3) {
      const libelle = suivants.map((i) => t.tokens[i]).join(' ');
      t.alive[idx[pos]] = false;
      suivants.forEach((i) => { t.alive[i] = false; });
      return libelle;
    }
  }

  return null;
}

function stripMoments(t) {
  for (const mot of MOMENTS) {
    const norm = aliveNorm(t);
    if (new RegExp('\\b' + mot + '\\b').test(norm)) {
      consume(t, mot);
    }
  }
}

/** Découpe le reste en tâche principale et sous-tâches. */
function splitSubtasks(t) {
  const idx = aliveIndexes(t);
  const coupures = [];

  for (let k = 0; k < idx.length; k++) {
    const w = t.norm[idx[k]];
    if (w === 'puis' || w === 'ensuite') {
      coupures.push({ at: k, skip: 1 });
    } else if (w === 'et' && k + 1 < idx.length && t.norm[idx[k + 1]] === 'apres') {
      coupures.push({ at: k, skip: 2 });
    }
  }

  if (!coupures.length) {
    return { main: aliveText(t), subs: [] };
  }

  const segments = [];
  let debut = 0;
  for (const c of coupures) {
    segments.push(idx.slice(debut, c.at));
    debut = c.at + c.skip;
  }
  segments.push(idx.slice(debut));

  const textes = segments
    .map((seg) => seg.map((i) => t.tokens[i]).join(' ').trim())
    .filter(Boolean);

  return { main: textes[0] || '', subs: textes.slice(1) };
}

/** Nettoie un titre : amorces inutiles, ponctuation, majuscule initiale. */
function cleanTitle(str) {
  let out = (str || '').replace(/\s+/g, ' ').trim();

  let change = true;
  while (change) {
    change = false;
    for (const amorce of AMORCES) {
      const test = normalize(out);
      if (test === amorce || test.indexOf(amorce + ' ') === 0) {
        const nbMots = amorce.split(' ').length;
        out = out.split(/\s+/).slice(nbMots).join(' ').trim();
        change = true;
        break;
      }
    }
  }

  out = out.replace(/^[\s,;:.]+/, '').replace(/[\s,;:.]+$/, '').trim();

  // Retire les déterminants restés seuls après extraction
  let mots = out.split(/\s+/).filter(Boolean);
  while (mots.length > 1 && ORPHELINS.indexOf(normalizeWord(mots[mots.length - 1])) !== -1) {
    mots.pop();
  }
  while (mots.length > 1 && ORPHELINS.indexOf(normalizeWord(mots[0])) !== -1) {
    mots.shift();
  }
  out = mots.join(' ').trim();

  if (!out) return '';
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/* ------------------------------------------------------------------ */
/* Analyse principale                                                  */
/* ------------------------------------------------------------------ */

/**
 * @param {string} phrase   texte dicté
 * @param {object} context  { projects, contacts, today }
 */
export function parseDictation(phrase, context = {}) {
  const projects = context.projects || [];
  const contacts = context.contacts || [];
  const today = context.today ? new Date(context.today) : new Date();
  today.setHours(0, 0, 0, 0);

  const original = (phrase || '').trim();
  const t = makeText(original);
  const detected = [];

  const dueDate = extractDate(t, today);
  if (dueDate) detected.push({ type: 'date', label: dueDate });

  const priority = extractPriority(t);
  if (priority) {
    detected.push({ type: 'priority', label: priority === 1 ? 'Haute' : 'Basse' });
  }

  const project = extractProject(t, projects);
  if (project) detected.push({ type: 'project', label: project.name });

  let contact = null;
  if (!project) {
    contact = extractContact(t, contacts);
    if (contact) detected.push({ type: 'contact', label: contact });
  }

  stripMoments(t);

  const parts = splitSubtasks(t);
  const subtasks = parts.subs.map(cleanTitle).filter(Boolean);
  if (subtasks.length) {
    detected.push({ type: 'subtasks', label: subtasks.length + ' sous-tâche(s)' });
  }

  let title = cleanTitle(parts.main);
  if (!title) title = cleanTitle(original);

  return {
    title,
    note: '',
    contact: contact || '',
    projectId: project ? project.id : null,
    priority: priority || 2,
    dueDate: dueDate || null,
    subtasks: subtasks.map((titre, i) => ({
      id: 'v' + Date.now() + i,
      title: titre,
      done: false,
    })),
    detected,
    original,
  };
}
