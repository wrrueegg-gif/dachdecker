import type { Settings } from './db';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_NAME: string;
  SESSION_DAYS: string;
  /** Secrets (wrangler secret put ...) */
  APP_PASSWORD?: string;
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
}

export interface Flash {
  type: 'success' | 'error' | 'info';
  text: string;
}

export type AppEnv = {
  Bindings: Env;
  Variables: {
    settings: Settings;
    flash: Flash | null;
  };
};
