#!/usr/bin/env node
/**
 * Richtet Keleo auf Cloudflare ein und veröffentlicht es – in einem Schritt.
 * Kann beliebig oft ausgeführt werden (idempotent):
 *
 *   1. prüft die Anmeldung bei Cloudflare (wrangler login oder CLOUDFLARE_API_TOKEN)
 *   2. legt die D1-Datenbank «keleo» an, falls sie fehlt, und trägt die ID in wrangler.jsonc ein
 *   3. führt die Datenbank-Migrationen aus
 *   4. veröffentlicht den Worker
 *   5. setzt fehlende Secrets (APP_PASSWORD, SESSION_SECRET, optional RESEND_API_KEY / MAIL_FROM)
 *
 * Umgebungsvariablen (alle optional):
 *   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID   statt `wrangler login` (z. B. in CI)
 *   KELEO_APP_PASSWORD                            Anmeldepasswort; sonst wird eines erzeugt und angezeigt
 *   KELEO_RESEND_API_KEY, KELEO_MAIL_FROM         E-Mail-Versand über Resend
 *   KELEO_D1_LOCATION                             Standort-Hinweis für die Datenbank (Standard: weur = Westeuropa)
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'wrangler.jsonc');
const DB_NAME = 'keleo';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const log = (msg) => console.log(`\n▸ ${msg}`);
const ok = (msg) => console.log(`  ✔ ${msg}`);
const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

/** Führt wrangler aus. Ohne TTY auf stdin stellt wrangler keine Rückfragen. */
function wrangler(args, { input, quiet = false, allowFail = false } = {}) {
  const r = spawnSync(npx, ['wrangler', ...args], {
    cwd: root,
    encoding: 'utf8',
    input,
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    env: process.env,
    shell: process.platform === 'win32',
  });
  const out = (r.stdout || '') + (r.stderr || '');
  if (!quiet) process.stdout.write(out.replace(/^.*Proxy environment variables detected.*\n?/m, ''));
  if (r.status !== 0 && !allowFail) fail(`«wrangler ${args.join(' ')}» ist fehlgeschlagen (siehe Ausgabe oben).`);
  return { status: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function parseJson(text, what) {
  const start = text.indexOf('[') >= 0 && (text.indexOf('{') < 0 || text.indexOf('[') < text.indexOf('{')) ? text.indexOf('[') : text.indexOf('{');
  if (start < 0) fail(`Unerwartete Antwort beim Lesen von ${what}:\n${text}`);
  try {
    return JSON.parse(text.slice(start));
  } catch {
    fail(`Antwort von ${what} konnte nicht gelesen werden:\n${text}`);
  }
}

// 1. Anmeldung prüfen
log('Anmeldung bei Cloudflare prüfen');
const who = wrangler(['whoami'], { quiet: true, allowFail: true });
if (who.status !== 0 || /not authenticated|Not logged in|unable to/i.test(who.stdout + who.stderr)) {
  fail(
    'Nicht bei Cloudflare angemeldet.\n' +
      '  Entweder einmalig «npx wrangler login» ausführen (öffnet den Browser),\n' +
      '  oder die Variablen CLOUDFLARE_API_TOKEN und CLOUDFLARE_ACCOUNT_ID setzen\n' +
      '  (Token mit Vorlage «Edit Cloudflare Workers» unter dash.cloudflare.com/profile/api-tokens).',
  );
}
const accountLine = (who.stdout.match(/│\s*([^│]+?)\s*│\s*([0-9a-f]{32})\s*│/) || [])[0];
ok(accountLine ? `Angemeldet (${accountLine.replace(/│/g, ' ').trim().replace(/\s+/g, ' ')})` : 'Angemeldet');

// 2. Datenbank anlegen / finden
log(`D1-Datenbank «${DB_NAME}» suchen`);
const findDb = () => {
  const list = parseJson(wrangler(['d1', 'list', '--json'], { quiet: true }).stdout, 'd1 list');
  return (Array.isArray(list) ? list : []).find((d) => d.name === DB_NAME);
};
let db = findDb();
if (!db) {
  const location = process.env.KELEO_D1_LOCATION || 'weur';
  log(`Datenbank wird angelegt (Standort-Hinweis: ${location})`);
  wrangler(['d1', 'create', DB_NAME, '--location', location]);
  db = findDb();
  if (!db) fail('Die Datenbank wurde angelegt, konnte aber nicht gefunden werden – bitte Skript erneut ausführen.');
} else ok(`vorhanden (ID ${db.uuid})`);

// 3. ID in wrangler.jsonc eintragen
const config = readFileSync(configPath, 'utf8');
const patched = config.replace(/("database_name":\s*"keleo"[\s\S]*?"database_id":\s*")[^"]*(")/, `$1${db.uuid}$2`);
if (patched !== config) {
  writeFileSync(configPath, patched);
  ok('wrangler.jsonc aktualisiert (database_id) – bitte diese Änderung ins Git übernehmen');
} else ok('wrangler.jsonc ist aktuell');

// 4. Migrationen
log('Datenbank-Migrationen ausführen');
wrangler(['d1', 'migrations', 'apply', DB_NAME, '--remote']);

// 5. Veröffentlichen
log('Worker veröffentlichen');
const deploy = wrangler(['deploy']);
const url = (deploy.stdout.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i) || [])[0];

// 6. Secrets
log('Secrets prüfen');
const existingRaw = wrangler(['secret', 'list', '--format', 'json'], { quiet: true, allowFail: true });
const existing = new Set((existingRaw.status === 0 ? parseJson(existingRaw.stdout, 'secret list') : []).map((s) => s.name));
const toSet = {};
let generatedPassword = null;
if (!existing.has('APP_PASSWORD')) {
  if (process.env.KELEO_APP_PASSWORD) toSet.APP_PASSWORD = process.env.KELEO_APP_PASSWORD;
  else if (process.env.CI) fail('Kein Anmeldepasswort gesetzt: bitte das Secret KELEO_APP_PASSWORD im CI hinterlegen.');
  else {
    generatedPassword = randomBytes(9).toString('base64url');
    toSet.APP_PASSWORD = generatedPassword;
  }
}
if (!existing.has('SESSION_SECRET')) toSet.SESSION_SECRET = randomBytes(32).toString('hex');
if (process.env.KELEO_RESEND_API_KEY) toSet.RESEND_API_KEY = process.env.KELEO_RESEND_API_KEY;
if (process.env.KELEO_MAIL_FROM) toSet.MAIL_FROM = process.env.KELEO_MAIL_FROM;
if (Object.keys(toSet).length > 0) {
  wrangler(['secret', 'bulk'], { input: JSON.stringify(toSet), quiet: true });
  ok(`gesetzt: ${Object.keys(toSet).join(', ')}`);
} else ok('alle Secrets vorhanden');

// Zusammenfassung
console.log('\n──────────────────────────────────────────────');
console.log(`✔ Keleo ist veröffentlicht${url ? `: ${url}` : ''}`);
if (generatedPassword) {
  console.log(`  Anmeldepasswort: ${generatedPassword}`);
  console.log('  (wird nur jetzt angezeigt – ändern mit: npx wrangler secret put APP_PASSWORD)');
}
if (!existing.has('RESEND_API_KEY') && !toSet.RESEND_API_KEY) {
  console.log('  E-Mail-Versand: nicht eingerichtet (optional: KELEO_RESEND_API_KEY und KELEO_MAIL_FROM setzen).');
}
console.log('──────────────────────────────────────────────\n');
