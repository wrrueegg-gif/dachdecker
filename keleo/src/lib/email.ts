/**
 * E-Mail-Versand über Resend (https://resend.com). Resend hat einen kostenlosen
 * Plan (aktuell 3'000 E-Mails/Monat) und eine einfache HTTP-API, die direkt aus
 * einer Vercel-Funktion aufgerufen werden kann. Benötigt die Umgebungsvariablen
 * RESEND_API_KEY und MAIL_FROM (eine Adresse auf einer bei Resend verifizierten Domain).
 */
import { config } from '../config';

export interface MailAttachment {
  filename: string;
  content: Uint8Array;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export type MailResult = { ok: true; id: string } | { ok: false; error: string };

export function isMailConfigured(): boolean {
  return !!config.resendApiKey && !!config.mailFrom;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export async function sendMail(msg: MailMessage): Promise<MailResult> {
  if (!isMailConfigured()) {
    return { ok: false, error: 'E-Mail-Versand ist nicht konfiguriert (Umgebungsvariablen RESEND_API_KEY und MAIL_FROM fehlen). PDF herunterladen und manuell versenden.' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: config.mailFrom,
      to: [msg.to],
      reply_to: msg.replyTo || undefined,
      subject: msg.subject,
      text: msg.text,
      attachments: (msg.attachments ?? []).map((a) => ({ filename: a.filename, content: toBase64(a.content) })),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, error: `Resend antwortete mit ${res.status}: ${body.slice(0, 300)}` };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: data.id ?? '' };
}

/** Ersetzt Platzhalter wie {kunde}, {nummer}, {betrag} in E-Mail-Vorlagen. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => values[key] ?? m);
}
