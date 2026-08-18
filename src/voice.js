/**
 * Reconnaissance vocale.
 *
 * S'appuie sur le moteur de reconnaissance intégré à Android, celui du
 * clavier Gboard. Aucun service tiers, aucune clé d'API, et cela fonctionne
 * hors connexion dès que le pack de langue française est installé sur le
 * téléphone (Paramètres → Général → Reconnaissance vocale).
 *
 * Le module natif n'existe pas dans Expo Go : l'application le détecte et
 * bascule sur la saisie texte plutôt que de planter.
 */

let Voice = null;
let available = false;

try {
  // eslint-disable-next-line global-require
  Voice = require('@react-native-voice/voice').default;
  available = !!Voice;
} catch (e) {
  available = false;
}

/** Indique si la dictée est utilisable sur cet appareil. */
export function isVoiceAvailable() {
  return available;
}

/**
 * Démarre l'écoute.
 *
 * @param {object} handlers { onPartial, onResult, onError, onEnd }
 * @returns {Promise<boolean>} vrai si l'écoute a démarré
 */
export async function startListening(handlers = {}) {
  if (!available) {
    handlers.onError && handlers.onError("La dictée n'est pas disponible sur cet appareil.");
    return false;
  }

  Voice.onSpeechPartialResults = (e) => {
    if (e.value && e.value.length) {
      handlers.onPartial && handlers.onPartial(e.value[0]);
    }
  };

  Voice.onSpeechResults = (e) => {
    if (e.value && e.value.length) {
      handlers.onResult && handlers.onResult(e.value[0]);
    }
  };

  Voice.onSpeechError = (e) => {
    const code = e && e.error ? e.error.code : '';
    handlers.onError && handlers.onError(messageErreur(code));
  };

  Voice.onSpeechEnd = () => {
    handlers.onEnd && handlers.onEnd();
  };

  try {
    await Voice.start('fr-FR');
    return true;
  } catch (err) {
    handlers.onError && handlers.onError("Impossible de démarrer l'écoute.");
    return false;
  }
}

/** Arrête l'écoute proprement. */
export async function stopListening() {
  if (!available) return;
  try {
    await Voice.stop();
  } catch (e) {
    // silence : l'arrêt d'une écoute déjà terminée n'est pas une erreur
  }
}

/** Libère les écouteurs natifs. */
export async function destroyVoice() {
  if (!available) return;
  try {
    await Voice.destroy();
    Voice.removeAllListeners();
  } catch (e) {
    // idem
  }
}

/** Traduit les codes d'erreur Android en messages compréhensibles. */
function messageErreur(code) {
  const codes = {
    1: 'Délai réseau dépassé.',
    2: 'Problème de réseau.',
    3: "Micro inaccessible. Vérifiez l'autorisation.",
    4: 'Erreur du service de reconnaissance.',
    5: 'Erreur interne du téléphone.',
    6: "Rien entendu. Parlez plus près du micro.",
    7: "Aucun mot reconnu. Réessayez.",
    8: 'Reconnaissance déjà en cours.',
    9: "Autorisation micro refusée.",
    11: "Pack de langue française absent. Installez-le dans les paramètres Android.",
  };
  return codes[String(code)] || codes[Number(code)] || "La dictée a échoué. Réessayez.";
}
