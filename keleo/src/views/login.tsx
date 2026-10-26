import type { FC } from 'hono/jsx';
import { Plain } from './layout';

export const LoginPage: FC<{ appName: string; error?: string; next?: string; configured: boolean }> = ({ appName, error, next, configured }) => (
  <Plain title="Anmelden" appName={appName}>
    <div class="login-box">
      <div class="brand brand-lg">
        <span class="brand-mark">K</span>
        <span>{appName}</span>
      </div>
      <p class="muted">Rechnungen, Offerten und Kunden – einfach im Griff.</p>
      {!configured ? (
        <div class="flash flash-error">
          Die Anmeldung ist noch nicht eingerichtet. Bitte die Umgebungsvariablen <code>APP_PASSWORD</code> und <code>SESSION_SECRET</code> setzen (lokal in <code>.env</code>, auf Vercel unter Project Settings → Environment Variables).
        </div>
      ) : null}
      {error ? <div class="flash flash-error">{error}</div> : null}
      <form method="post" action="/login" class="stack">
        <input type="hidden" name="next" value={next ?? ''} />
        <label class="field">
          <span class="field-label">Passwort</span>
          <input type="password" name="password" required autofocus autocomplete="current-password" />
        </label>
        <button class="btn btn-primary" type="submit" disabled={!configured}>
          Anmelden
        </button>
      </form>
    </div>
  </Plain>
);
