import type { FC } from 'hono/jsx';
import type { Settings } from '../db';
import { formatIban, isQrIban, isValidIban } from '../lib/qrbill';
import { Card, Checkbox, Input, Textarea } from './components';

export const SettingsPage: FC<{ s: Settings; mailConfigured: boolean; mailFrom: string }> = ({ s, mailConfigured, mailFrom }) => {
  const ibanOk = s.iban !== '' && isValidIban(s.iban);
  const qr = ibanOk && isQrIban(s.iban);
  return (
    <form method="post" action="/einstellungen" class="form">
      <div class="grid-2 grid-sidebar">
        <div class="stack">
          <Card title="Firma">
            <div class="form-grid">
              <Input label="Firmenname" name="company_name" value={s.company_name} class="span-2" required hint="Erscheint auf allen Dokumenten und als Zahlungsempfänger" />
              <Input label="Inhaber/in" name="owner_name" value={s.owner_name} />
              <Input label="Strasse" name="street" value={s.street} class="span-2" />
              <Input label="Nr." name="house_no" value={s.house_no} />
              <Input label="PLZ" name="zip" value={s.zip} />
              <Input label="Ort" name="city" value={s.city} class="span-2" />
              <Input label="Land" name="country" value={s.country} hint="Ländercode, z. B. CH" />
              <Input label="E-Mail" name="email" type="email" value={s.email} />
              <Input label="Telefon" name="phone" value={s.phone} />
              <Input label="Website" name="website" value={s.website} />
            </div>
          </Card>

          <Card title="Bank & QR-Rechnung">
            <div class="form-grid">
              <Input label="IBAN oder QR-IBAN" name="iban" value={formatIban(s.iban)} class="span-2" placeholder="CH00 0000 0000 0000 0000 0" hint="Die QR-IBAN erhalten Sie von Ihrer Bank; sie beginnt nach CHxx mit 30000–31999." />
              <Input label="Bank" name="bank_name" value={s.bank_name} />
            </div>
            <div class={`iban-info ${s.iban === '' ? '' : ibanOk ? 'ok' : 'bad'}`}>
              {s.iban === '' ? (
                <span>Noch keine IBAN erfasst – ohne IBAN wird kein Zahlteil erzeugt.</span>
              ) : !ibanOk ? (
                <span>Diese IBAN ist ungültig (Prüfziffer stimmt nicht).</span>
              ) : qr ? (
                <span><strong>QR-IBAN erkannt.</strong> Rechnungen erhalten eine 27-stellige QR-Referenz, die Bank kann Zahlungen damit automatisch zuordnen.</span>
              ) : (
                <span><strong>Normale IBAN erkannt.</strong> Rechnungen erhalten eine Creditor Reference (RF…). Für eine QR-Referenz bei Ihrer Bank eine QR-IBAN beantragen.</span>
              )}
            </div>
            {ibanOk ? <a class="btn btn-secondary btn-sm" href="/einstellungen/qr-test.pdf" target="_blank">Test-Zahlteil als PDF öffnen</a> : null}
          </Card>

          <Card title="Mehrwertsteuer">
            <Checkbox label="Mehrwertsteuerpflichtig" name="vat_enabled" checked={s.vat_enabled === 1} hint="Neue Dokumente weisen dann MwSt aus. Nicht MWST-pflichtige Kleinunternehmen (unter CHF 100'000 Umsatz) lassen dies aus." />
            <div class="form-grid">
              <Input label="MwSt-Nummer" name="vat_number" value={s.vat_number} placeholder="CHE-123.456.789 MWST" class="span-2" />
              <Input label="Standardsatz %" name="default_vat_rate" value={s.default_vat_rate} inputmode="decimal" hint="Normalsatz 8.1 %, reduziert 2.6 %, Beherbergung 3.8 %" />
            </div>
          </Card>

          <Card title="Nummern & Fristen">
            <div class="form-grid">
              <Input label="Präfix Rechnungen" name="invoice_prefix" value={s.invoice_prefix} hint="Ergibt z. B. R-2026-0001" />
              <Input label="Präfix Offerten" name="quote_prefix" value={s.quote_prefix} hint="Ergibt z. B. O-2026-0001" />
              <div />
              <Input label="Zahlungsfrist (Tage)" name="payment_terms_days" value={s.payment_terms_days} type="number" min="0" />
              <Input label="Gültigkeit Offerten (Tage)" name="quote_valid_days" value={s.quote_valid_days} type="number" min="0" />
            </div>
          </Card>

          <Card title="Standardtexte">
            <Textarea label="Einleitung Rechnung" name="invoice_intro" value={s.invoice_intro} rows={2} />
            <Textarea label="Schlusstext Rechnung" name="invoice_footer" value={s.invoice_footer} rows={2} />
            <Textarea label="Einleitung Offerte" name="quote_intro" value={s.quote_intro} rows={2} />
            <Textarea label="Schlusstext Offerte" name="quote_footer" value={s.quote_footer} rows={2} />
          </Card>

          <Card title="E-Mail-Vorlagen">
            <p class="hint">Platzhalter: {'{kunde}'}, {'{nummer}'}, {'{betrag}'}, {'{faellig}'}, {'{firma}'}</p>
            <Textarea label="Rechnung" name="email_text_invoice" value={s.email_text_invoice} rows={6} />
            <Textarea label="Offerte" name="email_text_quote" value={s.email_text_quote} rows={6} />
            <Textarea label="Zahlungserinnerung / Mahnung" name="email_text_reminder" value={s.email_text_reminder} rows={6} />
          </Card>
        </div>

        <div class="stack">
          <Card title="Speichern">
            <div class="stack-sm">
              <button class="btn btn-primary" type="submit">Einstellungen speichern</button>
            </div>
          </Card>
          <Card title="E-Mail-Versand">
            {mailConfigured ? (
              <p class="small">Versand über Resend ist eingerichtet.<br />Absender: <code>{mailFrom}</code></p>
            ) : (
              <div class="small stack-sm">
                <p>Nicht eingerichtet. Zum Versenden direkt aus Keleo:</p>
                <ol class="small">
                  <li>Kostenloses Konto bei <strong>resend.com</strong> anlegen und die eigene Domain verifizieren.</li>
                  <li>API-Key erzeugen.</li>
                  <li>Secrets setzen: <code>wrangler secret put RESEND_API_KEY</code> und <code>wrangler secret put MAIL_FROM</code> (z. B. «Firma &lt;rechnung@firma.ch&gt;»).</li>
                </ol>
                <p class="muted">Bis dahin: PDF herunterladen und aus dem eigenen Mailprogramm senden.</p>
              </div>
            )}
          </Card>
          <Card title="Hinweise">
            <ul class="tips small muted">
              <li>Strasse und Hausnummer getrennt erfassen (strukturierte Adresse, Pflicht seit Nov. 2025).</li>
              <li>Zuletzt gespeichert: {s.updated_at}</li>
            </ul>
          </Card>
        </div>
      </div>
    </form>
  );
};
