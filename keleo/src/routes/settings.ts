import { Hono } from 'hono';
import { updateSettings, type SettingsColumn } from '../db';
import type { AppEnv } from '../env';
import { today } from '../lib/dates';
import { isMailConfigured } from '../lib/email';
import { bool, int, str, type Body } from '../lib/form';
import { parseNumber } from '../lib/money';
import { renderQrTestPdf } from '../lib/pdf';
import { isValidIban, normalizeIban } from '../lib/qrbill';
import { SettingsPage } from '../views/settings';
import { flash, pdfResponse, render } from './shared';

export const settingsRoutes = new Hono<AppEnv>();

settingsRoutes.get('/', (c) =>
  render(c, 'Einstellungen', 'settings', SettingsPage({ s: c.get('settings'), mailConfigured: isMailConfigured(c.env), mailFrom: c.env.MAIL_FROM ?? '' }), {
    subtitle: 'Firma, Bankverbindung, MwSt, Nummern und Texte',
  }),
);

settingsRoutes.post('/', async (c) => {
  const b = (await c.req.parseBody()) as Body;
  const iban = normalizeIban(str(b, 'iban'));
  if (iban !== '' && !isValidIban(iban)) {
    flash(c, 'error', 'Die IBAN ist ungültig – die Einstellungen wurden nicht gespeichert.');
    return c.redirect('/einstellungen');
  }
  const prefix = (v: string, fallback: string) => v.replace(/[^A-Za-z0-9]/g, '').slice(0, 6) || fallback;
  const data: Partial<Record<SettingsColumn, string | number>> = {
    company_name: str(b, 'company_name'),
    owner_name: str(b, 'owner_name'),
    street: str(b, 'street'),
    house_no: str(b, 'house_no'),
    zip: str(b, 'zip'),
    city: str(b, 'city'),
    country: (str(b, 'country') || 'CH').toUpperCase().slice(0, 2),
    email: str(b, 'email'),
    phone: str(b, 'phone'),
    website: str(b, 'website'),
    vat_number: str(b, 'vat_number'),
    vat_enabled: bool(b, 'vat_enabled') ? 1 : 0,
    default_vat_rate: Math.max(0, Math.min(100, parseNumber(str(b, 'default_vat_rate'), 8.1))),
    iban,
    bank_name: str(b, 'bank_name'),
    payment_terms_days: Math.max(0, int(b, 'payment_terms_days', 30)),
    quote_valid_days: Math.max(0, int(b, 'quote_valid_days', 30)),
    invoice_prefix: prefix(str(b, 'invoice_prefix'), 'R'),
    quote_prefix: prefix(str(b, 'quote_prefix'), 'O'),
    invoice_intro: str(b, 'invoice_intro'),
    invoice_footer: str(b, 'invoice_footer'),
    quote_intro: str(b, 'quote_intro'),
    quote_footer: str(b, 'quote_footer'),
    email_text_invoice: str(b, 'email_text_invoice'),
    email_text_quote: str(b, 'email_text_quote'),
    email_text_reminder: str(b, 'email_text_reminder'),
  };
  await updateSettings(c.env.DB, data);
  flash(c, 'success', 'Einstellungen gespeichert.');
  return c.redirect('/einstellungen');
});

settingsRoutes.get('/qr-test.pdf', async (c) => {
  const s = c.get('settings');
  if (!s.iban || !isValidIban(s.iban)) {
    flash(c, 'error', 'Bitte zuerst eine gültige IBAN erfassen.');
    return c.redirect('/einstellungen');
  }
  const bytes = await renderQrTestPdf(s, today());
  return pdfResponse(bytes, 'keleo-test-zahlteil.pdf');
});
