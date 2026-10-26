/**
 * Keleo – die Hono-Anwendung (Routing und serverseitiges Rendering, JSX → HTML).
 * Läuft auf Vercel (src/index.ts) und lokal mit Node (src/dev.ts).
 */
import { Hono } from 'hono';
import { checkPassword, clearSession, createSession, hasValidSession, isConfigured, requireAuth, sameOriginOnly } from './auth';
import { config } from './config';
import { getSettings } from './db';
import { getDb } from './db/index';
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
  if (config.sessionSecret && (await hasValidSession(c, config.sessionSecret))) return c.redirect('/');
  return c.html(asHtml(LoginPage({ appName: config.appName, configured: isConfigured(), next: c.req.query('next') })));
});

app.post('/login', async (c) => {
  const appName = config.appName;
  if (!isConfigured()) return c.html(asHtml(LoginPage({ appName, configured: false })), 500);
  const body = (await c.req.parseBody()) as Body;
  const ok = await checkPassword(config.sessionSecret!, str(body, 'password'), config.appPassword!);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 500));
    return c.html(asHtml(LoginPage({ appName, configured: true, error: 'Das Passwort ist falsch.', next: str(body, 'next') })), 401);
  }
  await createSession(c, config.sessionSecret!, config.sessionDays);
  return c.redirect(safeBack(str(body, 'next'), '/'));
});

app.post('/logout', (c) => {
  clearSession(c);
  return c.redirect('/login');
});

// ---- Ab hier nur angemeldet ----
app.use('*', requireAuth);
app.use('*', async (c, next) => {
  const db = await getDb();
  c.set('db', db);
  c.set('settings', await getSettings(db));
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
  const hint = /ECONNREFUSED|ENOTFOUND|password authentication|DATABASE_URL|connect/i.test(err.message)
    ? 'Die Datenbank ist nicht erreichbar – bitte die Umgebungsvariable DATABASE_URL prüfen.'
    : err.message;
  return c.html(
    asHtml(<Plain title="Fehler" appName={config.appName}>
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
