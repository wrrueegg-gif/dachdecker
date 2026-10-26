import type { Settings } from './db';
import type { Sql } from './db/sql';

export interface Flash {
  type: 'success' | 'error' | 'info';
  text: string;
}

export type AppEnv = {
  Bindings: Record<string, never>;
  Variables: {
    db: Sql;
    settings: Settings;
    flash: Flash | null;
  };
};
