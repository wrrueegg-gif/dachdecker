import type { FC } from 'hono/jsx';
import { customerName, type Customer, type DocumentFull, type DocumentItem, type DocumentRow, type Settings } from '../db';
import { addDays, formatDate, formatDateTime } from '../lib/dates';
import { KINDS, type DocumentKind } from '../lib/kinds';
import { amountToInput, formatAmount, formatQuantity } from '../lib/money';
import { formatIban, formatReference, type ReferenceType } from '../lib/qrbill';
import { documentStatus } from '../lib/status';
import { computeTotals } from '../lib/totals';
import { ActionForm, Badge, Card, Checkbox, Empty, Input, Money, Select, Textarea } from './components';

const FILTERS: Record<DocumentKind, { value: string; label: string }[]> = {
  invoice: [
    { value: 'all', label: 'Alle' },
    { value: 'draft', label: 'Entwürfe' },
    { value: 'open', label: 'Offen' },
    { value: 'overdue', label: 'Überfällig' },
    { value: 'paid', label: 'Bezahlt' },
    { value: 'cancelled', label: 'Storniert' },
  ],
  quote: [
    { value: 'all', label: 'Alle' },
    { value: 'draft', label: 'Entwürfe' },
    { value: 'sent', label: 'Offen' },
    { value: 'accepted', label: 'Angenommen' },
    { value: 'declined', label: 'Abgelehnt' },
    { value: 'invoiced', label: 'Verrechnet' },
  ],
};

export const DocumentList: FC<{ kind: DocumentKind; docs: DocumentRow[]; status: string; q: string; today: string }> = ({ kind, docs, status, q, today }) => {
  const meta = KINDS[kind];
  const sum = docs.reduce((s, d) => s + d.total, 0);
  const openSum = docs.filter((d) => d.status === 'sent').reduce((s, d) => s + d.total - d.paid, 0);
  return (
    <>
      <form method="get" class="toolbar">
        <div class="tabs">
          {FILTERS[kind].map((f) => (
            <a href={`${meta.path}?status=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ''}`} class={status === f.value ? 'active' : ''}>
              {f.label}
            </a>
          ))}
        </div>
        <input type="hidden" name="status" value={status} />
        <input type="search" name="q" value={q} placeholder="Nummer, Titel oder Kunde …" />
        <button class="btn btn-secondary" type="submit">Suchen</button>
      </form>
      {docs.length === 0 ? (
        <Empty text={`Keine ${meta.plural} in dieser Ansicht.`}>
          <a class="btn btn-primary" href={`${meta.path}/neu`}>{meta.singular} erstellen</a>
        </Empty>
      ) : (
        <table class="table">
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Kunde</th>
              <th>Titel</th>
              <th>Datum</th>
              <th>{meta.dueLabel}</th>
              <th class="num">Total</th>
              {kind === 'invoice' ? <th class="num">Offen</th> : null}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr>
                <td><a href={`${meta.path}/${d.id}`} class="mono">{d.number}</a></td>
                <td><a href={`/kunden/${d.customer_id}`}>{d.customer_name}</a></td>
                <td class="muted">{d.title}</td>
                <td>{formatDate(d.date)}</td>
                <td class={d.status === 'sent' && d.due_date && d.due_date < today ? 'text-red' : ''}>{formatDate(d.due_date)}</td>
                <td class="num"><Money value={d.total} /></td>
                {kind === 'invoice' ? <td class="num">{d.status === 'sent' ? <Money value={d.total - d.paid} /> : <span class="muted">–</span>}</td> : null}
                <td><Badge status={documentStatus(d, today)} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colspan={5} class="muted">{docs.length} {docs.length === 1 ? meta.singular : meta.plural}</td>
              <td class="num"><Money value={sum} strong /></td>
              {kind === 'invoice' ? <td class="num"><Money value={openSum} strong /></td> : null}
              <td></td>
            </tr>
          </tfoot>
        </table>
      )}
    </>
  );
};

interface FormProps {
  kind: DocumentKind;
  doc?: DocumentFull | null;
  items: Pick<DocumentItem, 'description' | 'quantity' | 'unit' | 'unit_price' | 'vat_rate'>[];
  customers: Customer[];
  settings: Settings;
  action: string;
  today: string;
  preselectedCustomer?: number;
}

export const DocumentForm: FC<FormProps> = ({ kind, doc, items, customers, settings, action, today, preselectedCustomer }) => {
  const meta = KINDS[kind];
  const dueDays = kind === 'invoice' ? settings.payment_terms_days : settings.quote_valid_days;
  const vat = doc ? doc.vat_enabled === 1 : settings.vat_enabled === 1;
  const defaultVat = settings.default_vat_rate;
  const rows = items.length > 0 ? items : [{ description: '', quantity: 1, unit: '', unit_price: 0, vat_rate: defaultVat }];
  const customerOptions = customers.map((c) => ({ value: String(c.id), label: `${customerName(c)} (${c.number}${c.city ? ', ' + c.city : ''})` }));
  return (
    <form method="post" action={action} class="form" data-document-form data-currency={doc?.currency ?? 'CHF'}>
      <div class="grid-2 grid-sidebar">
        <div class="stack">
          <Card title="Kunde & Angaben">
            <div class="form-grid">
              <Select label="Kunde" name="customer_id" value={doc?.customer_id ?? preselectedCustomer ?? ''} options={customerOptions} required class="span-3" empty="– Kunde wählen –" hint={customers.length === 0 ? 'Noch keine Kunden erfasst – bitte zuerst einen Kunden anlegen.' : undefined} />
              <Input label="Titel / Betreff" name="title" value={doc?.title} class="span-3" placeholder={kind === 'invoice' ? 'z. B. Dachsanierung Musterstrasse 5' : 'z. B. Offerte Flachdach-Sanierung'} />
              <Input label="Datum" name="date" type="date" value={doc?.date ?? today} required />
              <Input label={meta.dueLabel} name="due_date" type="date" value={doc?.due_date ?? addDays(today, dueDays)} required hint={`Standard: ${dueDays} Tage`} />
              <Select label="Währung" name="currency" value={doc?.currency ?? 'CHF'} options={[{ value: 'CHF', label: 'CHF' }, { value: 'EUR', label: 'EUR' }]} />
            </div>
          </Card>

          <Card title="Positionen">
            <table class="table items-table" data-items>
              <thead>
                <tr>
                  <th class="w-pos">Pos.</th>
                  <th>Bezeichnung</th>
                  <th class="w-qty">Menge</th>
                  <th class="w-unit">Einheit</th>
                  <th class="w-price">Preis</th>
                  {vat ? <th class="w-vat">MwSt %</th> : null}
                  <th class="w-amount num">Betrag</th>
                  <th class="w-del"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it, idx) => (
                  <tr class="item-row">
                    <td class="pos muted">{idx + 1}</td>
                    <td><textarea name="item_desc[]" rows={1} placeholder="Beschreibung der Leistung oder des Artikels" data-autosize>{it.description}</textarea></td>
                    <td><input type="text" name="item_qty[]" value={formatQuantity(it.quantity)} inputmode="decimal" class="num" data-qty /></td>
                    <td><input type="text" name="item_unit[]" value={it.unit} placeholder="Std." list="units" /></td>
                    <td><input type="text" name="item_price[]" value={amountToInput(it.unit_price)} inputmode="decimal" class="num" data-price /></td>
                    {vat ? <td><input type="text" name="item_vat[]" value={formatQuantity(it.vat_rate)} inputmode="decimal" class="num" data-vat /></td> : <input type="hidden" name="item_vat[]" value="0" />}
                    <td class="num row-amount">{formatAmount(Math.round(it.quantity * it.unit_price))}</td>
                    <td><button type="button" class="btn btn-icon" data-remove-row title="Position entfernen">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vat ? <input type="hidden" name="vat_column" value="1" /> : null}
            <datalist id="units">
              <option value="Std." />
              <option value="Stk." />
              <option value="m" />
              <option value="m²" />
              <option value="m³" />
              <option value="kg" />
              <option value="Pausch." />
              <option value="Tag" />
            </datalist>
            <template id="item-row-template">
              <tr class="item-row">
                <td class="pos muted"></td>
                <td><textarea name="item_desc[]" rows={1} placeholder="Beschreibung der Leistung oder des Artikels" data-autosize></textarea></td>
                <td><input type="text" name="item_qty[]" value="1" inputmode="decimal" class="num" data-qty /></td>
                <td><input type="text" name="item_unit[]" value="" placeholder="Std." list="units" /></td>
                <td><input type="text" name="item_price[]" value="0.00" inputmode="decimal" class="num" data-price /></td>
                {vat ? <td><input type="text" name="item_vat[]" value={formatQuantity(defaultVat)} inputmode="decimal" class="num" data-vat /></td> : <input type="hidden" name="item_vat[]" value="0" />}
                <td class="num row-amount">0.00</td>
                <td><button type="button" class="btn btn-icon" data-remove-row title="Position entfernen">×</button></td>
              </tr>
            </template>
            <div class="items-footer">
              <button type="button" class="btn btn-secondary btn-sm" data-add-row>+ Position</button>
              <div class="totals" data-totals data-vat={vat ? '1' : '0'}>
                <div class="totals-row"><span>Zwischensumme</span><span data-subtotal>0.00</span></div>
                <div class="totals-row">
                  <span>Rabatt <input type="text" name="discount_percent" value={formatQuantity(doc?.discount_percent ?? 0)} inputmode="decimal" class="num tiny" data-discount /> %</span>
                  <span data-discount-amount>0.00</span>
                </div>
                {vat ? <div data-vat-rows></div> : null}
                <div class="totals-row"><span>Rundung</span><span data-rounding>0.00</span></div>
                <div class="totals-row total"><span>Total</span><span data-total>0.00</span></div>
              </div>
            </div>
            <Checkbox label="Mehrwertsteuer ausweisen" name="vat_enabled" checked={vat} hint="Änderung wird nach dem Speichern wirksam (Spalte MwSt erscheint/verschwindet)." />
          </Card>

          <Card title="Texte">
            <Textarea label="Einleitung" name="intro" value={doc?.intro ?? (kind === 'invoice' ? settings.invoice_intro : settings.quote_intro)} rows={3} />
            <Textarea label="Schlusstext" name="footer" value={doc?.footer ?? (kind === 'invoice' ? settings.invoice_footer : settings.quote_footer)} rows={3} />
          </Card>
        </div>
        <div class="stack">
          <Card title={doc ? `${meta.singular} ${doc.number}` : `Neue ${meta.singular}`}>
            <p class="muted small">{doc ? `Erstellt am ${formatDateTime(doc.created_at)}` : `Die Nummer wird beim Speichern vergeben (${kind === 'invoice' ? settings.invoice_prefix : settings.quote_prefix}-${today.slice(0, 4)}-…).`}</p>
            <div class="stack-sm">
              <button class="btn btn-primary" type="submit">{doc ? 'Speichern' : `${meta.singular} als Entwurf speichern`}</button>
              <a class="btn btn-ghost" href={doc ? `${meta.path}/${doc.id}` : meta.path}>Abbrechen</a>
            </div>
          </Card>
          <Card title="Tipps">
            <ul class="tips small muted">
              <li>Mengen und Preise können mit Punkt oder Komma eingegeben werden.</li>
              <li>Das Total wird bei CHF automatisch auf 5 Rappen gerundet.</li>
              <li>{kind === 'quote' ? 'Eine angenommene Offerte kann mit einem Klick in eine Rechnung umgewandelt werden.' : 'Die QR-Referenz und der Zahlteil werden beim PDF automatisch erzeugt.'}</li>
            </ul>
          </Card>
        </div>
      </div>
    </form>
  );
};

interface DetailProps {
  doc: DocumentFull;
  settings: Settings;
  today: string;
  qrErrors: string[];
  mailConfigured: boolean;
  mailDefaults: { subject: string; text: string; reminderSubject: string; reminderText: string };
  referenceType: ReferenceType;
}

export const DocumentDetail: FC<DetailProps> = ({ doc, settings, today, qrErrors, mailConfigured, mailDefaults, referenceType }) => {
  const meta = KINDS[doc.kind];
  const base = `${meta.path}/${doc.id}`;
  const status = documentStatus(doc, today);
  const open = doc.total - doc.paid;
  const t = computeTotals(doc.items, doc.discount_percent, doc.vat_enabled === 1, doc.currency);
  const isInvoice = doc.kind === 'invoice';
  const editable = doc.status === 'draft';
  const canReopen = doc.status === 'sent' && doc.payments.length === 0;
  const overdue = isInvoice && doc.status === 'sent' && !!doc.due_date && doc.due_date < today;
  const reminderLabel = doc.reminder_level === 0 ? 'Zahlungserinnerung' : doc.reminder_level === 1 ? '1. Mahnung' : '2. Mahnung';
  const currentReminderLabel = doc.reminder_level === 1 ? 'Zahlungserinnerung' : doc.reminder_level === 2 ? '1. Mahnung' : '2. Mahnung';

  return (
    <div class="grid-2 grid-sidebar">
      <div class="stack">
        <Card title="Positionen">
          <table class="table compact">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Bezeichnung</th>
                <th class="num">Menge</th>
                <th>Einheit</th>
                <th class="num">Preis</th>
                {doc.vat_enabled ? <th class="num">MwSt</th> : null}
                <th class="num">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((it) => (
                <tr>
                  <td class="muted">{it.position}</td>
                  <td class="pre">{it.description}</td>
                  <td class="num">{formatQuantity(it.quantity)}</td>
                  <td>{it.unit}</td>
                  <td class="num">{formatAmount(it.unit_price)}</td>
                  {doc.vat_enabled ? <td class="num">{formatQuantity(it.vat_rate)} %</td> : null}
                  <td class="num">{formatAmount(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div class="totals totals-view">
            {t.discount_amount || t.vat_lines.length || t.rounding ? <div class="totals-row"><span>Zwischensumme</span><span>{formatAmount(t.subtotal)}</span></div> : null}
            {t.discount_amount ? <div class="totals-row"><span>Rabatt {formatQuantity(doc.discount_percent)} %</span><span>- {formatAmount(t.discount_amount)}</span></div> : null}
            {t.vat_lines.map((v) => <div class="totals-row"><span>MwSt {formatQuantity(v.rate)} % von {formatAmount(v.base)}</span><span>{formatAmount(v.amount)}</span></div>)}
            {t.rounding ? <div class="totals-row"><span>Rundung</span><span>{formatAmount(t.rounding)}</span></div> : null}
            <div class="totals-row total"><span>Total {doc.currency}</span><span>{formatAmount(doc.total)}</span></div>
            {isInvoice && doc.paid > 0 ? <div class="totals-row"><span>Bezahlt</span><span>- {formatAmount(doc.paid)}</span></div> : null}
            {isInvoice && doc.paid > 0 ? <div class="totals-row total"><span>Offen</span><span>{formatAmount(open)}</span></div> : null}
          </div>
          {doc.intro ? <div class="prose muted small"><strong>Einleitung:</strong> {doc.intro}</div> : null}
          {doc.footer ? <div class="prose muted small"><strong>Schlusstext:</strong> {doc.footer}</div> : null}
        </Card>

        {isInvoice ? (
          <Card title="Zahlungen">
            {doc.payments.length === 0 ? <p class="muted small">Noch keine Zahlung erfasst.</p> : (
              <table class="table compact">
                <thead><tr><th>Datum</th><th>Art</th><th>Bemerkung</th><th class="num">Betrag</th><th></th></tr></thead>
                <tbody>
                  {doc.payments.map((p) => (
                    <tr>
                      <td>{formatDate(p.date)}</td>
                      <td>{p.method === 'bank' ? 'Bank' : p.method === 'cash' ? 'Bar' : p.method === 'twint' ? 'TWINT' : 'Andere'}</td>
                      <td class="muted">{p.note}</td>
                      <td class="num"><Money value={p.amount} /></td>
                      <td><ActionForm action={`/zahlungen/${p.id}/loeschen`} label="Löschen" cls="btn-link btn-sm" confirm="Zahlung löschen?" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {doc.status === 'sent' || doc.status === 'paid' ? (
              <form method="post" action={`${base}/zahlungen`} class="inline-form">
                <input type="date" name="date" value={today} required />
                <input type="text" name="amount" value={open > 0 ? amountToInput(open) : ''} inputmode="decimal" placeholder="Betrag" required class="num" />
                <select name="method">
                  <option value="bank">Bank</option>
                  <option value="cash">Bar</option>
                  <option value="twint">TWINT</option>
                  <option value="other">Andere</option>
                </select>
                <input type="text" name="note" placeholder="Bemerkung (optional)" />
                <button class="btn btn-primary btn-sm" type="submit">Zahlung erfassen</button>
              </form>
            ) : <p class="muted small">Zahlungen können erfasst werden, sobald die Rechnung gesendet ist.</p>}
          </Card>
        ) : null}

        {isInvoice ? (
          <Card title="QR-Rechnung">
            {qrErrors.length > 0 ? (
              <div class="flash flash-error">
                <strong>Der Zahlteil kann noch nicht erzeugt werden:</strong>
                <ul>{qrErrors.map((e) => <li>{e}</li>)}</ul>
                <a href="/einstellungen">Einstellungen prüfen</a>
              </div>
            ) : (
              <dl class="dl">
                <dt>Konto</dt><dd class="mono">{formatIban(settings.iban)}</dd>
                <dt>Referenzart</dt><dd>{referenceType === 'QRR' ? 'QR-Referenz (QR-IBAN)' : referenceType === 'SCOR' ? 'Creditor Reference (SCOR)' : 'Ohne Referenz'}</dd>
                {doc.reference ? <><dt>Referenz</dt><dd class="mono">{formatReference(referenceType, doc.reference)}</dd></> : null}
                <dt>Zahlungspflichtiger</dt>
                <dd>{doc.customer.street && doc.customer.zip && doc.customer.city ? 'wird im Zahlteil vorbelegt' : <span class="text-orange">Adresse des Kunden unvollständig – Feld bleibt leer</span>}</dd>
              </dl>
            )}
          </Card>
        ) : null}

        <Card title="Per E-Mail senden">
          {!mailConfigured ? (
            <p class="hint">E-Mail-Versand ist nicht eingerichtet (Umgebungsvariablen <code>RESEND_API_KEY</code> und <code>MAIL_FROM</code>). Alternativ das PDF herunterladen und aus dem eigenen Mailprogramm versenden – anschliessend «Als gesendet markieren».</p>
          ) : null}
          {!doc.customer.email ? <p class="hint warn">Der Kunde hat keine E-Mail-Adresse hinterlegt.</p> : null}
          <form method="post" action={`${base}/senden`} class="stack">
            <div class="form-grid">
              <Input label="An" name="to" type="email" value={doc.customer.email} required class="span-3" />
              {isInvoice && doc.reminder_level > 0 ? (
                <Select label="Dokument" name="variant" value="reminder" options={[{ value: 'reminder', label: `${currentReminderLabel} (aktuelle Mahnstufe)` }, { value: 'document', label: 'Rechnung (Original)' }]} class="span-3" />
              ) : <input type="hidden" name="variant" value="document" />}
              <Input label="Betreff" name="subject" value={isInvoice && doc.reminder_level > 0 ? mailDefaults.reminderSubject : mailDefaults.subject} required class="span-3" />
              <Textarea label="Text" name="text" value={isInvoice && doc.reminder_level > 0 ? mailDefaults.reminderText : mailDefaults.text} rows={7} class="span-3" />
            </div>
            <div><button class="btn btn-primary" type="submit" disabled={!mailConfigured}>{isInvoice && doc.reminder_level > 0 ? 'Mahnung senden' : `${meta.singular} senden`}</button></div>
          </form>
        </Card>
      </div>

      <div class="stack">
        <Card title="Status">
          <div class="status-head">
            <Badge status={status} />
            <span class="muted small">{doc.sent_at ? `gesendet ${formatDateTime(doc.sent_at)}` : ''}</span>
          </div>
          <dl class="dl">
            <dt>Kunde</dt><dd><a href={`/kunden/${doc.customer_id}`}>{doc.customer_name}</a></dd>
            <dt>Datum</dt><dd>{formatDate(doc.date)}</dd>
            <dt>{meta.dueLabel}</dt><dd class={overdue ? 'text-red' : ''}>{formatDate(doc.due_date)}</dd>
            <dt>Total</dt><dd><Money value={doc.total} currency={doc.currency} strong /></dd>
            {isInvoice && doc.status === 'sent' ? <><dt>Offen</dt><dd><Money value={open} currency={doc.currency} strong /></dd></> : null}
            {doc.source_number ? <><dt>Aus Offerte</dt><dd><a href={`/offerten/${doc.source_id}`}>{doc.source_number}</a></dd></> : null}
            {doc.invoice_numbers.length > 0 ? <><dt>Rechnung</dt><dd>{doc.invoice_numbers.map((i) => <a href={`/rechnungen/${i.id}`}>{i.number} </a>)}</dd></> : null}
            {isInvoice && doc.reminder_level > 0 ? <><dt>Mahnstufe</dt><dd>{currentReminderLabel} ({formatDate(doc.reminder_at?.slice(0, 10))})</dd></> : null}
            {isInvoice && doc.paid_at ? <><dt>Bezahlt am</dt><dd>{formatDate(doc.paid_at.slice(0, 10))}</dd></> : null}
          </dl>
        </Card>

        <Card title="Aktionen">
          <div class="stack-sm">
            <a class="btn btn-secondary" href={`${base}/pdf`} target="_blank">PDF {isInvoice ? '(mit Zahlteil)' : ''}</a>
            {isInvoice && doc.reminder_level > 0 ? <a class="btn btn-secondary" href={`${base}/pdf?mahnung=1`} target="_blank">PDF {currentReminderLabel}</a> : null}
            {editable ? <a class="btn btn-secondary" href={`${base}/bearbeiten`}>Bearbeiten</a> : null}
            {editable ? <ActionForm action={`${base}/status`} label="Als gesendet markieren" cls="btn-primary" hidden={{ status: 'sent' }} /> : null}
            {canReopen ? <ActionForm action={`${base}/status`} label="Zurück zu Entwurf" cls="btn-secondary" hidden={{ status: 'draft' }} /> : null}
            {!isInvoice && doc.status === 'sent' ? <ActionForm action={`${base}/status`} label="Als angenommen markieren" cls="btn-success" hidden={{ status: 'accepted' }} /> : null}
            {!isInvoice && doc.status === 'sent' ? <ActionForm action={`${base}/status`} label="Als abgelehnt markieren" cls="btn-secondary" hidden={{ status: 'declined' }} /> : null}
            {!isInvoice && (doc.status === 'sent' || doc.status === 'accepted') ? <ActionForm action={`${base}/rechnung`} label="In Rechnung umwandeln" cls="btn-primary" /> : null}
            {!isInvoice && doc.status === 'declined' ? <ActionForm action={`${base}/status`} label="Wieder öffnen" cls="btn-secondary" hidden={{ status: 'sent' }} /> : null}
            {isInvoice && overdue && doc.reminder_level < 3 ? <ActionForm action={`${base}/mahnung`} label={`${reminderLabel} erstellen`} cls="btn-warn" confirm={`${reminderLabel} erstellen? Die Mahnstufe wird erhöht und die neue Frist beträgt 10 Tage.`} /> : null}
            {isInvoice && doc.status === 'sent' ? <ActionForm action={`${base}/status`} label="Stornieren" cls="btn-ghost" hidden={{ status: 'cancelled' }} confirm="Rechnung wirklich stornieren?" /> : null}
            {isInvoice && doc.status === 'cancelled' ? <ActionForm action={`${base}/status`} label="Stornierung aufheben" cls="btn-secondary" hidden={{ status: 'sent' }} /> : null}
            <ActionForm action={`${base}/kopieren`} label="Kopieren" cls="btn-ghost" />
            {doc.status !== 'paid' ? <ActionForm action={`${base}/loeschen`} label="Löschen" cls="btn-danger" confirm={`${meta.singular} ${doc.number} endgültig löschen?`} /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
};
