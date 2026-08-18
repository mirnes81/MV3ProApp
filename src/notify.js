/**
 * Rappels par notification.
 *
 * Deux rappels par tâche datée : la veille au soir pour anticiper, et le
 * matin même. Tout est programmé localement par Android, sans serveur, donc
 * cela fonctionne hors connexion.
 */

let Notifications = null;
let available = false;

try {
  // eslint-disable-next-line global-require
  Notifications = require('expo-notifications');
  available = !!Notifications;
} catch (e) {
  available = false;
}

if (available) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function isNotifyAvailable() {
  return available;
}

/** Demande l'autorisation d'afficher des notifications. */
export async function requestNotifyPermission() {
  if (!available) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return !!asked.granted;
  } catch (e) {
    return false;
  }
}

/** Crée le canal Android, obligatoire depuis Android 8. */
export async function ensureChannel() {
  if (!available) return;
  try {
    await Notifications.setNotificationChannelAsync('taches', {
      name: 'Rappels de tâches',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
    });
  } catch (e) {
    // canal déjà existant
  }
}

function atHour(dateKey, hour, minute) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

/**
 * Reprogramme tous les rappels à partir de la liste de tâches.
 * On efface tout puis on replanifie : plus simple et plus sûr que de
 * suivre chaque notification individuellement.
 *
 * @param {array}  tasks
 * @param {object} options { eveningHour, morningHour }
 */
export async function rescheduleAll(tasks, options = {}) {
  if (!available) return 0;

  const eveningHour = options.eveningHour ?? 18;
  const morningHour = options.morningHour ?? 7;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    return 0;
  }

  const now = new Date();
  let planned = 0;

  const actives = tasks.filter((t) => !t.deleted && !t.done && t.dueDate);

  for (const task of actives) {
    const jour = atHour(task.dueDate, morningHour, 0);
    const veille = new Date(atHour(task.dueDate, eveningHour, 0));
    veille.setDate(veille.getDate() - 1);

    const echeances = [
      { date: veille, titre: 'Demain sur le chantier', corps: task.title },
      { date: jour, titre: "Aujourd'hui", corps: task.title },
    ];

    for (const e of echeances) {
      if (e.date <= now) continue;
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: e.titre,
            body: e.corps,
            data: { taskId: task.id },
            channelId: 'taches',
          },
          trigger: e.date,
        });
        planned++;
      } catch (err) {
        // une notification qui échoue ne doit pas bloquer les suivantes
      }
    }
  }

  return planned;
}

/** Supprime tous les rappels programmés. */
export async function cancelAll() {
  if (!available) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    // rien à annuler
  }
}
