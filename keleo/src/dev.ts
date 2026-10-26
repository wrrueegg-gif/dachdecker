/**
 * Lokaler Entwicklungsserver: Node + PGlite (Postgres im Prozess, Daten in .data/).
 * Start: npm run dev → http://localhost:8787
 */
import { existsSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

if (existsSync('.env')) process.loadEnvFile('.env');

const { default: app } = await import('./web');

const root = new Hono();
root.use('/*', serveStatic({ root: './public' }));
root.route('/', app);

const port = Number(process.env.PORT) || 8787;
serve({ fetch: root.fetch, port }, (info) => {
  console.log(`Keleo läuft auf http://localhost:${info.port} (${process.env.DATABASE_URL ? 'Postgres' : 'lokale PGlite-Datenbank in .data/'})`);
});
