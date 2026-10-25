/**
 * Keleo – Einstiegspunkt des Cloudflare Workers.
 * Hono übernimmt Routing und serverseitiges Rendering (JSX → HTML).
 */
import { Hono } from 'hono';
import { checkPassword, clearSession, createSession, hasValidSession, isConfigured, requireAuth, sameOriginOnly } from './auth';
import { getSettings } from './db';
import type { AppEnv } from './env';
import { str, type Body } from './lib/form';
import { customers } from './routes/customers';
import { dashboard } from './routes/dashboard';
import { documentRoutes } from './routes/documents';
import { misc } from './routes/misc';
import { settingsRoutes } from './routes/settings';
import { asHtml, readFlash, render, safeBack } from './routes/shared';
import { tasks } from './routes/tasks';
import { LoginPage } from './views/login';
import { Plain } from './views/layout';

const app = new Hono<AppEnv>();

app.use('*', sameOriginOnly);
app.get('/_health', (c) => c.text('ok'));

// ---- Anmeldung (ohne Session erreichbar) ----
app.get('/login', async (c) => {
  if (c.env.SESSION_SECRET && (await hasValidSession(c, c.env.SESSION_SECRET))) return c.redirect('/');
  return c.html(asHtml(LoginPage({ appName: c.env.APP_NAME || 'Keleo', configured: isConfigured(c.env), next: c.req.query('next') })));
});

app.post('/login', async (c) => {
  const appName = c.env.APP_NAME || 'Keleo';
  if (!isConfigured(c.env)) return c.html(asHtml(LoginPage({ appName, configured: false })), 500);
  const body = (await c.req.parseBody()) as Body;
  const ok = await checkPassword(c.env.SESSION_SECRET!, str(body, 'password'), c.env.APP_PASSWORD!);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 500));
    return c.html(asHtml(LoginPage({ appName, configured: true, error: 'Das Passwort ist falsch.', next: str(body, 'next') })), 401);
  }
  await createSession(c, c.env.SESSION_SECRET!, Math.max(1, parseInt(c.env.SESSION_DAYS || '30', 10) || 30));
  return c.redirect(safeBack(str(body, 'next'), '/'));
});

app.post('/logout', (c) => {
  clearSession(c);
  return c.redirect('/login');
});

// ---- Ab hier nur angemeldet ----
app.use('*', requireAuth);
app.use('*', async (c, next) => {
  c.set('settings', await getSettings(c.env.DB));
  c.set('flash', readFlash(c));
  await next();
});

app.route('/', dashboard);
app.route('/kunden', customers);
app.route('/offerten', documentRoutes('quote'));
app.route('/rechnungen', documentRoutes('invoice'));
app.route('/aufgaben', tasks);
app.route('/einstellungen', settingsRoutes);
app.route('/', misc);

app.notFound((c) => {
  c.status(404);
  return render(c, 'Nicht gefunden', '', <div class="empty"><p>Diese Seite gibt es nicht.</p><a class="btn btn-primary" href="/">Zur Übersicht</a></div>);
});

app.onError((err, c) => {
  console.error(err);
  const hint = /no such table|D1_ERROR/i.test(err.message) ? 'Die Datenbank scheint noch nicht eingerichtet zu sein – bitte `npm run db:migrate:local` bzw. `npm run db:migrate:remote` ausführen.' : err.message;
  return c.html(
    asHtml(<Plain title="Fehler" appName={c.env.APP_NAME || 'Keleo'}>
      <div class="login-box">
        <h1>Da ist etwas schiefgelaufen</h1>
        <p class="muted">{hint}</p>
        <a class="btn btn-primary" href="/">Zur Übersicht</a>
      </div>
    </Plain>),
    500,
  );
});

export default app;
