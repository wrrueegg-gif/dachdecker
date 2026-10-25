/** Heutiges Datum in der Schweiz als 'YYYY-MM-DD'. */
export function today(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' });
}

export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Tage von `from` bis `to` (positiv, wenn `to` später ist). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
}

/** '2026-10-25' → '25.10.2026' */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** SQLite-Zeitstempel (UTC) → '25.10.2026, 14:03' in Schweizer Zeit */
export function formatDateTime(sqlite: string | null | undefined): string {
  if (!sqlite) return '';
  const d = new Date(sqlite.replace(' ', 'T') + (sqlite.endsWith('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return sqlite;
  return d.toLocaleString('de-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
