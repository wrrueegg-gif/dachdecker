/**
 * Einfache Einzelbenutzer-Anmeldung: Passwort aus der Umgebungsvariable APP_PASSWORD,
 * Sitzung als HMAC-signiertes Cookie (kein Server-Zustand nötig).
 */
import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { config } from './config';
import type { AppEnv } from './env';

const COOKIE = 'keleo_session';
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

/** Zeitkonstanter Vergleich zweier Strings. */
export function safeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < Math.max(ab.length, bb.length); i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export async function checkPassword(secret: string, given: string, expected: string): Promise<boolean> {
  // Beide Werte werden gehasht, damit der Vergleich unabhängig von der Länge zeitkonstant ist.
  return safeEqual(await hmac(secret, given), await hmac(secret, expected));
}

export async function createSession(c: Context<AppEnv>, secret: string, days: number): Promise<void> {
  const exp = Date.now() + days * 86400000;
  const sig = await hmac(secret, `session:${exp}`);
  setCookie(c, COOKIE, `${exp}.${sig}`, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: days * 86400,
  });
}

export async function hasValidSession(c: Context<AppEnv>, secret: string): Promise<boolean> {
  const raw = getCookie(c, COOKIE);
  if (!raw) return false;
  const [expStr, sig] = raw.split('.');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() || !sig) return false;
  return safeEqual(sig, await hmac(secret, `session:${exp}`));
}

export function clearSession(c: Context<AppEnv>): void {
  deleteCookie(c, COOKIE, { path: '/' });
}

export function isConfigured(): boolean {
  return !!config.appPassword && !!config.sessionSecret && config.sessionSecret.length >= 16;
}

/** Leitet nicht angemeldete Besucher auf /login um. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const secret = config.sessionSecret ?? '';
  if (secret && (await hasValidSession(c, secret))) return next();
  const next_ = new URL(c.req.url).pathname;
  return c.redirect('/login' + (next_ !== '/' ? `?next=${encodeURIComponent(next_)}` : ''));
};

/** Einfacher CSRF-Schutz: schreibende Requests müssen von derselben Origin kommen. */
export const sameOriginOnly: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.method === 'POST' || c.req.method === 'PUT' || c.req.method === 'DELETE') {
    const host = c.req.header('host');
    const origin = c.req.header('origin');
    const fetchSite = c.req.header('sec-fetch-site');
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return c.text('Forbidden', 403);
    if (origin && host && new URL(origin).host !== host) return c.text('Forbidden', 403);
  }
  return next();
};
