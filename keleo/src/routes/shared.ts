import type { Context } from 'hono';
import { html } from 'hono/html';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Child } from 'hono/jsx';
import type { AppEnv, Flash } from '../env';
import { Layout } from '../views/layout';

export interface ActionLink {
  href: string;
  label: string;
  cls?: string;
}

const FLASH_COOKIE = 'keleo_flash';

export function flash(c: Context<AppEnv>, type: Flash['type'], text: string): void {
  setCookie(c, FLASH_COOKIE, JSON.stringify({ type, text }), { path: '/', maxAge: 60, httpOnly: true, sameSite: 'Lax' });
}

export function readFlash(c: Context<AppEnv>): Flash | null {
  const raw = getCookie(c, FLASH_COOKIE);
  if (!raw) return null;
  deleteCookie(c, FLASH_COOKIE, { path: '/' });
  try {
    const f = JSON.parse(raw) as Flash;
    return f && typeof f.text === 'string' ? f : null;
  } catch {
    return null;
  }
}

export type Renderable = unknown;

/** JSX-Knoten werden von c.html() zur Laufzeit korrekt in HTML umgewandelt; die Typen passen nur nicht exakt. */
export const asHtml = (node: unknown): string => node as string;

export function render(c: Context<AppEnv>, title: string, active: string, body: Renderable, opts: { subtitle?: string; actions?: ActionLink[] } = {}) {
  const settings = c.get('settings');
  const actions = opts.actions?.length
    ? html`${opts.actions.map((a) => html`<a class="btn ${a.cls ?? 'btn-secondary'}" href="${a.href}">${a.label}</a>`)}`
    : undefined;
  return c.html(
    asHtml(
      Layout({
        title,
        active,
        appName: c.env.APP_NAME || 'Keleo',
        companyName: settings?.company_name,
        flash: c.get('flash'),
        actions,
        subtitle: opts.subtitle,
        children: body as Child,
      }),
    ),
  );
}

export function idParam(c: Context<AppEnv>, name = 'id'): number | null {
  const n = parseInt(c.req.param(name) ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Sicherer Redirect auf einen internen Pfad (kein offener Redirect). */
export function safeBack(value: string | undefined, fallback: string): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return fallback;
}

/** PDF-Antwort zum Anzeigen im Browser (inline). */
export function pdfResponse(bytes: Uint8Array, filename: string): Response {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename.replace(/[^A-Za-z0-9._-]/g, '_')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
