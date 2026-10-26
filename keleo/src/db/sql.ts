/**
 * Kleine Datenbank-Abstraktion mit zwei Treibern:
 *  - postgres.js für Produktion (Supabase/Postgres, über DATABASE_URL)
 *  - PGlite (Postgres als WebAssembly) für lokale Entwicklung und Tests – ohne Installation
 *
 * SQL wird im Postgres-Dialekt geschrieben; Platzhalter dürfen `$1, $2 …` oder `?` sein.
 */
import postgres, { type Sql as PgSql, type TransactionSql } from 'postgres';

export type Row = Record<string, unknown>;

export interface Sql {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  one<T = Row>(text: string, params?: unknown[]): Promise<T | null>;
  /** Führt ein Statement aus und liefert die Anzahl betroffener Zeilen. */
  exec(text: string, params?: unknown[]): Promise<number>;
  /** Führt mehrere Statements in einer Transaktion aus. */
  tx<T>(fn: (t: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Wandelt `?`-Platzhalter in `$1, $2 …` um (ausserhalb von Stringliteralen). */
export function toDollar(text: string): string {
  if (!text.includes('?')) return text;
  let out = '';
  let n = 0;
  let inString = false;
  for (const ch of text) {
    if (ch === "'") inString = !inString;
    if (ch === '?' && !inString) out += '$' + ++n;
    else out += ch;
  }
  return out;
}

/** BigInt-Werte (int8 aus COUNT/SUM) in normale Zahlen umwandeln. */
function normalize<T>(row: Row): T {
  for (const k of Object.keys(row)) {
    const v = row[k];
    if (typeof v === 'bigint') row[k] = Number(v);
  }
  return row as T;
}

// ---------- postgres.js (Produktion) ----------

type PgExecutor = PgSql | TransactionSql;

function wrapPg(client: PgExecutor, root: PgSql): Sql {
  return {
    async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
      const rows = await client.unsafe(toDollar(text), params as never[]);
      return (rows as unknown as Row[]).map((r) => normalize<T>(r));
    },
    async one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
      const rows = await this.query<T>(text, params);
      return rows[0] ?? null;
    },
    async exec(text: string, params: unknown[] = []): Promise<number> {
      const r = await client.unsafe(toDollar(text), params as never[]);
      return r.count ?? 0;
    },
    async tx<T>(fn: (t: Sql) => Promise<T>): Promise<T> {
      return (await (client as PgSql).begin(async (t) => fn(wrapPg(t, root)))) as T;
    },
    async close(): Promise<void> {
      await root.end({ timeout: 5 });
    },
  };
}

export function createPostgresDriver(connectionString: string): Sql {
  const client = postgres(connectionString, {
    // Supabase-Pooler im Transaction-Modus unterstützt keine vorbereiteten Statements.
    prepare: false,
    ssl: 'require',
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    types: {
      bigint: { to: 20, from: [20], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      numeric: { to: 1700, from: [1700], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
    },
  });
  return wrapPg(client, client);
}

// ---------- PGlite (lokal & Tests) ----------

interface PgliteLike {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[]; affectedRows?: number }>;
  exec(text: string): Promise<unknown>;
  transaction<T>(fn: (tx: PgliteLike) => Promise<T>): Promise<T>;
  close?: () => Promise<void>;
}

function wrapPglite(pg: PgliteLike, root: PgliteLike): Sql {
  return {
    async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
      const r = await pg.query<Row>(toDollar(text), params);
      return r.rows.map((row) => normalize<T>(row));
    },
    async one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
      const rows = await this.query<T>(text, params);
      return rows[0] ?? null;
    },
    async exec(text: string, params: unknown[] = []): Promise<number> {
      if (params.length === 0 && /;\s*\S/.test(text)) {
        // mehrere Statements (Migrationen)
        await pg.exec(text);
        return 0;
      }
      const r = await pg.query(toDollar(text), params);
      return r.affectedRows ?? 0;
    },
    async tx<T>(fn: (t: Sql) => Promise<T>): Promise<T> {
      return pg.transaction(async (t) => fn(wrapPglite(t, root)));
    },
    async close(): Promise<void> {
      await root.close?.();
    },
  };
}

/** @param dataDir Verzeichnis für die Daten; ohne Angabe läuft die Datenbank nur im Speicher. */
export async function createPgliteDriver(dataDir?: string): Promise<Sql> {
  const { PGlite } = await import('@electric-sql/pglite');
  if (dataDir) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dataDir, { recursive: true });
  }
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  return wrapPglite(pg as unknown as PgliteLike, pg as unknown as PgliteLike);
}
