/** Konfiguration aus Umgebungsvariablen (Vercel: Project Settings → Environment Variables; lokal: .env). */
export const config = {
  get appName(): string {
    return process.env.APP_NAME || 'Keleo';
  },
  get sessionDays(): number {
    const n = parseInt(process.env.SESSION_DAYS || '30', 10);
    return Number.isFinite(n) && n > 0 ? n : 30;
  },
  get appPassword(): string | undefined {
    return process.env.APP_PASSWORD || undefined;
  },
  get sessionSecret(): string | undefined {
    return process.env.SESSION_SECRET || undefined;
  },
  get resendApiKey(): string | undefined {
    return process.env.RESEND_API_KEY || undefined;
  },
  get mailFrom(): string | undefined {
    return process.env.MAIL_FROM || undefined;
  },
};
