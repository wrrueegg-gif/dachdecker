/**
 * Liefert die (einmal initialisierte) Datenbankverbindung.
 * Mit DATABASE_URL: Postgres (Supabase). Ohne: lokale PGlite-Datenbank im Ordner .data/.
 */
import { migrate } from './migrations';
import { createPgliteDriver, createPostgresDriver, type Sql } from './sql';

let instance: Promise<Sql> | null = null;

async function create(): Promise<Sql> {
  const url = process.env.DATABASE_URL;
  const db = url ? createPostgresDriver(url) : await createPgliteDriver(process.env.PGLITE_DIR || '.data/keleo');
  const applied = await migrate(db);
  if (applied.length) console.log(`[keleo] Migrationen ausgeführt: ${applied.join(', ')}`);
  return db;
}

export function getDb(): Promise<Sql> {
  if (!instance) {
    instance = create().catch((err) => {
      instance = null;
      throw err;
    });
  }
  return instance;
}

export type { Sql } from './sql';
