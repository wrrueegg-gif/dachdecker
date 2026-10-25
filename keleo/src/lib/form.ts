/** Hilfsfunktionen zum Lesen von Formulardaten aus Hono's parseBody(). */
export type Body = Record<string, string | File | (string | File)[]>;

export function str(b: Body, key: string, fallback = ''): string {
  const v = b[key];
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0].trim();
  return fallback;
}

export function arr(b: Body, key: string): string[] {
  const v = b[key];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') return [v];
  return [];
}

export function bool(b: Body, key: string): boolean {
  const v = str(b, key);
  return v === '1' || v === 'on' || v === 'true';
}

export function int(b: Body, key: string, fallback = 0): number {
  const n = parseInt(str(b, key), 10);
  return Number.isFinite(n) ? n : fallback;
}
