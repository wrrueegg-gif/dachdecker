/**
 * Geldbeträge werden intern immer in Rappen (ganze Zahlen) geführt,
 * damit keine Rundungsfehler durch Fliesskommazahlen entstehen.
 */

/** "1'234.50", "1234,50", 1234.5 → 123450 (Rappen) */
export function parseAmount(input: unknown): number {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : 0;
  if (typeof input !== 'string') return 0;
  const s = input.replace(/['’\s]/g, '').replace(',', '.').trim();
  if (s === '' || s === '-') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Zahl mit Komma oder Punkt als Dezimaltrenner lesen (z. B. Mengen, Prozente). */
export function parseNumber(input: unknown, fallback = 0): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : fallback;
  if (typeof input !== 'string') return fallback;
  const s = input.replace(/['’\s]/g, '').replace(',', '.').trim();
  if (s === '') return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

/** Auf 5 Rappen runden (schweizerische Rappenrundung). */
export function roundTo5(rappen: number): number {
  return Math.round(rappen / 5) * 5;
}

/** 123450 → "1'234.50" */
export function formatAmount(rappen: number): string {
  const neg = rappen < 0;
  const abs = Math.abs(Math.round(rappen));
  const francs = Math.floor(abs / 100);
  const cents = abs % 100;
  const f = francs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${neg ? '-' : ''}${f}.${cents.toString().padStart(2, '0')}`;
}

export function formatMoney(rappen: number, currency = 'CHF'): string {
  return `${currency} ${formatAmount(rappen)}`;
}

/** Für Eingabefelder: 123450 → "1234.50" */
export function amountToInput(rappen: number): string {
  return (rappen / 100).toFixed(2);
}

export function formatQuantity(q: number): string {
  if (Number.isInteger(q)) return String(q);
  return q.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatPercent(p: number): string {
  return `${formatQuantity(p)} %`;
}
