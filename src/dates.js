const pad = (n) => String(n).padStart(2, '0');

export function toKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey() {
  return toKey(new Date());
}

export function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toKey(d);
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 15.06.2026 */
export function formatDate(key) {
  if (!key) return null;
  const [y, m, d] = key.split('-');
  return `${d}.${m}.${y}`;
}

export function isOverdue(key) {
  if (!key) return false;
  return key < todayKey();
}

export function isToday(key) {
  return key === todayKey();
}

/** Libellé court : Aujourd'hui / Demain / Hier / 15.06.2026 */
export function humanDate(key) {
  if (!key) return null;
  if (key === todayKey()) return "Aujourd'hui";
  if (key === addDays(1)) return 'Demain';
  if (key === addDays(-1)) return 'Hier';
  return formatDate(key);
}
