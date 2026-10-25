import { Hono, type Context } from 'hono';
import {
  addPayment, convertQuoteToInvoice, copyDocument, createDocument, deleteDocument, getDocument, listCustomers, listDocuments,
  setDocumentStatus, setReference, setReminder, updateDocument, type DocumentFull, type DocumentInput, type Settings,
} from '../db';
import type { AppEnv } from '../env';
import { addDays, formatDate, isValidDate, today } from '../lib/dates';
import { fillTemplate, isMailConfigured, sendMail } from '../lib/email';
import { arr, bool, int, str, type Body } from '../lib/form';
import { KINDS, type DocumentKind } from '../lib/kinds';
import { formatAmount, parseAmount, parseNumber } from '../lib/money';
import { qrBillDataFor, referenceFor, referenceTypeOf, renderDocumentPdf } from '../lib/pdf';
import { validateQrBill } from '../lib/qrbill';
import type { ItemInput } from '../lib/totals';
import { DocumentDetail, DocumentForm, DocumentList } from '../views/documents';
import { flash, idParam, pdfResponse, render } from './shared';

const REMINDER_LABELS = ['', 'Zahlungserinnerung', '1. Mahnung', '2. Mahnung'];
const REMINDER_DAYS = 10;

function greeting(doc: DocumentFull): string {
  const c = doc.customer;
  if (c.salutation && c.last_name) return `${c.salutation} ${c.last_name}`;
  if (c.first_name || c.last_name) return `${c.first_name} ${c.last_name}`.trim();
  return c.company;
}

function mailDefaults(doc: DocumentFull, s: Settings) {
  const meta = KINDS[doc.kind];
  const open = doc.total - doc.paid;
  const values = {
    kunde: greeting(doc),
    nummer: doc.number,
    betrag: `${doc.currency} ${formatAmount(doc.total)}`,
    faellig: formatDate(doc.due_date),
    firma: s.company_name,
  };
  const label = REMINDER_LABELS[Math.min(doc.reminder_level, 3)] || 'Zahlungserinnerung';
  return {
    subject: `${meta.singular} ${doc.number}${s.company_name ? ` – ${s.company_name}` : ''}`,
    text: fillTemplate(doc.kind === 'invoice' ? s.email_text_invoice : s.email_text_quote, values),
    reminderSubject: `${label} zu Rechnung ${doc.number}${s.company_name ? ` – ${s.company_name}` : ''}`,
    reminderText: fillTemplate(s.email_text_reminder, { ...values, betrag: `${doc.currency} ${formatAmount(open)}`, faellig: formatDate(addDays(doc.reminder_at?.slice(0, 10) ?? today(), REMINDER_DAYS)) }),
  };
}

/** Stellt sicher, dass eine Rechnung eine zur IBAN passende Referenz hat. */
async function ensureReference(db: D1Database, doc: DocumentFull, s: Settings): Promise<void> {
  if (doc.kind !== 'invoice' || !s.iban) return;
  const wanted = referenceFor(s, doc);
  if (doc.reference !== wanted && (doc.reference === '' || doc.status === 'draft')) {
    await setReference(db, doc.id, wanted);
    doc.reference = wanted;
  }
}

function qrErrorsFor(doc: DocumentFull, s: Settings): string[] {
  if (doc.kind !== 'invoice') return [];
  if (!s.iban) return ['In den Einstellungen ist keine IBAN hinterlegt.'];
  return validateQrBill(qrBillDataFor(s, doc, doc.total > 0 ? doc.total : null));
}

export function documentRoutes(kind: DocumentKind) {
  const meta = KINDS[kind];
  const r = new Hono<AppEnv>();

  const parseInput = (b: Body, s: Settings): { input: DocumentInput; errors: string[] } => {
    const descs = arr(b, 'item_desc[]');
    const qtys = arr(b, 'item_qty[]');
    const units = arr(b, 'item_unit[]');
    const prices = arr(b, 'item_price[]');
    const vats = arr(b, 'item_vat[]');
    const vat_enabled = bool(b, 'vat_enabled');
    const vatColumnShown = str(b, 'vat_column') === '1';
    const items: ItemInput[] = [];
    for (let i = 0; i < descs.length; i++) {
      const description = (descs[i] ?? '').trim();
      const unit_price = parseAmount(prices[i] ?? '0');
      if (description === '' && unit_price === 0) continue;
      let vat_rate = parseNumber(vats[i] ?? '0', 0);
      if (vat_enabled && !vatColumnShown) vat_rate = s.default_vat_rate;
      items.push({ description, quantity: parseNumber(qtys[i] ?? '1', 1), unit: (units[i] ?? '').trim(), unit_price, vat_rate });
    }
    const date = str(b, 'date');
    const due = str(b, 'due_date');
    const customer_id = int(b, 'customer_id', 0);
    const errors: string[] = [];
    if (customer_id <= 0) errors.push('Bitte einen Kunden wählen.');
    if (!isValidDate(date)) errors.push('Das Datum ist ungültig.');
    if (!isValidDate(due)) errors.push(`${meta.dueLabel}: Das Datum ist ungültig.`);
    if (items.length === 0) errors.push('Bitte mindestens eine Position mit Bezeichnung oder Preis erfassen.');
    return {
      input: {
        customer_id,
        date,
        due_date: due,
        title: str(b, 'title'),
        intro: str(b, 'intro'),
        footer: str(b, 'footer'),
        discount_percent: Math.max(0, Math.min(100, parseNumber(str(b, 'discount_percent'), 0))),
        vat_enabled,
        currency: str(b, 'currency') === 'EUR' ? 'EUR' : 'CHF',
        items,
      },
      errors,
    };
  };

  const loadDoc = async (c: Context<AppEnv>): Promise<DocumentFull | null> => {
    const id = idParam(c);
    const doc = id ? await getDocument(c.env.DB, id) : null;
    return doc && doc.kind === kind ? doc : null;
  };

  r.get('/', async (c) => {
    const status = c.req.query('status') ?? 'all';
    const q = c.req.query('q') ?? '';
    const docs = await listDocuments(c.env.DB, kind, { status, q });
    return render(c, meta.plural, meta.navKey, DocumentList({ kind, docs, status, q, today: today() }), {
      actions: [{ href: `${meta.path}/neu`, label: `Neue ${meta.singular}`, cls: 'btn-primary' }],
    });
  });

  r.get('/neu', async (c) => {
    const customers = await listCustomers(c.env.DB);
    const pre = parseInt(c.req.query('kunde') ?? '', 10);
    return render(c, `Neue ${meta.singular}`, meta.navKey, DocumentForm({ kind, items: [], customers, settings: c.get('settings'), action: meta.path, today: today(), preselectedCustomer: Number.isFinite(pre) ? pre : undefined }));
  });

  r.post('/', async (c) => {
    const s = c.get('settings');
    const b = (await c.req.parseBody({ all: true })) as Body;
    const { input, errors } = parseInput(b, s);
    if (errors.length) {
      flash(c, 'error', errors.join(' '));
      const customers = await listCustomers(c.env.DB);
      return render(c, `Neue ${meta.singular}`, meta.navKey, DocumentForm({ kind, items: input.items, customers, settings: s, action: meta.path, today: today(), preselectedCustomer: input.customer_id || undefined }));
    }
    const id = await createDocument(c.env.DB, kind, input, kind === 'invoice' ? s.invoice_prefix : s.quote_prefix);
    flash(c, 'success', `${meta.singular} wurde als Entwurf gespeichert.`);
    return c.redirect(`${meta.path}/${id}`);
  });

  r.get('/:id', async (c) => {
    const doc = await loadDoc(c);
    if (!doc) return c.notFound();
    const s = c.get('settings');
    await ensureReference(c.env.DB, doc, s);
    const qrErrors = qrErrorsFor(doc, s);
    return render(c, `${meta.singular} ${doc.number}`, meta.navKey, DocumentDetail({ doc, settings: s, today: today(), qrErrors, mailConfigured: isMailConfigured(c.env), mailDefaults: mailDefaults(doc, s), referenceType: referenceTypeOf(doc.reference) }), {
      subtitle: `${doc.customer_name}${doc.title ? ' · ' + doc.title : ''}`,
    });
  });

  r.get('/:id/bearbeiten', async (c) => {
    const doc = await loadDoc(c);
    if (!doc) return c.notFound();
    if (doc.status !== 'draft') {
      flash(c, 'info', 'Nur Entwürfe können bearbeitet werden. Mit «Zurück zu Entwurf» lässt sich das Dokument wieder öffnen.');
      return c.redirect(`${meta.path}/${doc.id}`);
    }
    const customers = await listCustomers(c.env.DB, '', true);
    return render(c, `${meta.singular} ${doc.number} bearbeiten`, meta.navKey, DocumentForm({ kind, doc, items: doc.items, customers, settings: c.get('settings'), action: `${meta.path}/${doc.id}`, today: today() }));
  });

  r.post('/:id', async (c) => {
    const doc = await loadDoc(c);
    if (!doc) return c.notFound();
    if (doc.status !== 'draft') {
      flash(c, 'error', 'Dieses Dokument ist kein Entwurf mehr und kann nicht geändert werden.');
      return c.redirect(`${meta.path}/${doc.id}`);
    }
    const s = c.get('settings');
    const b = (await c.req.parseBody({ all: true })) as Body;
    const { input, errors } = parseInput(b, s);
    if (errors.length) {
      flash(c, 'error', errors.join(' '));
      const customers = await listCustomers(c.env.DB, '', true);
      return render(c, `${meta.singular} ${doc.number} bearbeiten`, meta.navKey, DocumentForm({ kind, doc, items: input.items, customers, settings: s, action: `${meta.path}/${doc.id}`, today: today() }));
    }
    await updateDocument(c.env.DB, doc.id, input);
    flash(c, 'success', 'Gespeichert.');
    return c.redirect(`${meta.path}/${doc.id}`);
  });

  r.post('/:id/status', async (c) => {
    const doc = await loadDoc(c);
    if (!doc) return c.notFound();
    const b = (await c.req.parseBody()) as Body;
    const status = str(b, 'status');
    const allowed = kind === 'invoice' ? ['draft', 'sent', 'cancelled'] : ['draft', 'sent', 'accepted', 'declined'];
    if (!allowed.includes(status)) return c.text('Ungültiger Status', 400);
    if (status === 'draft' && doc.payments.length > 0) {
      flash(c, 'error', 'Rechnungen mit erfassten Zahlungen können nicht zurück in den Entwurf.');
      return c.redirect(`${meta.path}/${doc.id}`);
    }
    await setDocumentStatus(c.env.DB, doc.id, status);
    flash(c, 'success', 'Status aktualisiert.');
    return c.redirect(`${meta.path}/${doc.id}`);
  });

  r.post('/:id/loeschen', async (c) => {
    const doc = await loadDoc(c);
    if (!doc) return c.notFound();
    await deleteDocument(c.env.DB, doc.id);
    flash(c, 'success', `${meta.singular} ${doc.number} wurde gelöscht.`);
    return c.redirect(meta.path);
  });

  r.post('/:id/kopieren', async (c) => {
    const doc = await loadDoc(c);
    if (!doc) return c.notFound();
    const s = c.get('settings');
    const t = today();
    const dueDays = kind === 'invoice' ? s.payment_terms_days : s.quote_valid_days;
    const id = await copyDocument(c.env.DB, doc, kind === 'invoice' ? s.invoice_prefix : s.quote_prefix, t, addDays(t, dueDays));
    flash(c, 'success', `Kopie von ${doc.number} als neuer Entwurf erstellt.`);
    return c.redirect(`${meta.path}/${id}/bearbeiten`);
  });

  r.get('/:id/pdf', async (c) => {
    const doc = await loadDoc(c);
    if (!doc) return c.notFound();
    const s = c.get('settings');
    await ensureReference(c.env.DB, doc, s);
    const reminder = kind === 'invoice' && c.req.query('mahnung') === '1' && doc.reminder_level > 0 ? doc.reminder_level : 0;
    const qrOk = kind === 'invoice' && qrErrorsFor(doc, s).length === 0;
    const bytes = await renderDocumentPdf(doc, s, {
      todayIso: today(),
      reminderLevel: reminder,
      reminderDue: addDays(doc.reminder_at?.slice(0, 10) ?? today(), REMINDER_DAYS),
      includeQrBill: qrOk,
    });
    const name = reminder > 0 ? `${doc.number}-${REMINDER_LABELS[reminder].replace(/[.\s]/g, '')}.pdf` : `${doc.number}.pdf`;
    return pdfResponse(bytes, name);
  });

  r.post('/:id/senden', async (c) => {
    const doc = await loadDoc(c);
    if (!doc) return c.notFound();
    const s = c.get('settings');
    const b = (await c.req.parseBody()) as Body;
    const to = str(b, 'to');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      flash(c, 'error', 'Bitte eine gültige Empfängeradresse angeben.');
      return c.redirect(`${meta.path}/${doc.id}`);
    }
    await ensureReference(c.env.DB, doc, s);
    const variant = str(b, 'variant') === 'reminder' && doc.reminder_level > 0 ? doc.reminder_level : 0;
    const bytes = await renderDocumentPdf(doc, s, {
      todayIso: today(),
      reminderLevel: variant,
      reminderDue: addDays(doc.reminder_at?.slice(0, 10) ?? today(), REMINDER_DAYS),
      includeQrBill: kind === 'invoice' && qrErrorsFor(doc, s).length === 0,
    });
    const filename = variant > 0 ? `${doc.number}-${REMINDER_LABELS[variant].replace(/[.\s]/g, '')}.pdf` : `${doc.number}.pdf`;
    const result = await sendMail(c.env, { to, subject: str(b, 'subject') || `${meta.singular} ${doc.number}`, text: str(b, 'text'), replyTo: s.email || undefined, attachments: [{ filename, content: bytes }] });
    if (!result.ok) {
      flash(c, 'error', `Versand fehlgeschlagen: ${result.error}`);
      return c.redirect(`${meta.path}/${doc.id}`);
    }
    if (doc.status === 'draft') await setDocumentStatus(c.env.DB, doc.id, 'sent');
    flash(c, 'success', `${variant > 0 ? REMINDER_LABELS[variant] : meta.singular} wurde an ${to} gesendet.`);
    return c.redirect(`${meta.path}/${doc.id}`);
  });

  if (kind === 'invoice') {
    r.post('/:id/zahlungen', async (c) => {
      const doc = await loadDoc(c);
      if (!doc) return c.notFound();
      const b = (await c.req.parseBody()) as Body;
      const amount = parseAmount(str(b, 'amount'));
      const date = str(b, 'date');
      if (amount <= 0 || !isValidDate(date)) {
        flash(c, 'error', 'Bitte Betrag und Datum der Zahlung prüfen.');
        return c.redirect(`${meta.path}/${doc.id}`);
      }
      const method = ['bank', 'cash', 'twint', 'other'].includes(str(b, 'method')) ? str(b, 'method') : 'bank';
      await addPayment(c.env.DB, doc.id, { date, amount, method, note: str(b, 'note') });
      flash(c, 'success', `Zahlung über ${doc.currency} ${formatAmount(amount)} erfasst.`);
      return c.redirect(`${meta.path}/${doc.id}`);
    });

    r.post('/:id/mahnung', async (c) => {
      const doc = await loadDoc(c);
      if (!doc) return c.notFound();
      if (doc.status !== 'sent' || doc.reminder_level >= 3) {
        flash(c, 'error', 'Für diese Rechnung kann keine weitere Mahnung erstellt werden.');
        return c.redirect(`${meta.path}/${doc.id}`);
      }
      const level = doc.reminder_level + 1;
      await setReminder(c.env.DB, doc.id, level, today());
      flash(c, 'success', `${REMINDER_LABELS[level]} erstellt – PDF prüfen und per E-Mail oder Post versenden.`);
      return c.redirect(`${meta.path}/${doc.id}`);
    });
  }

  if (kind === 'quote') {
    r.post('/:id/rechnung', async (c) => {
      const doc = await loadDoc(c);
      if (!doc) return c.notFound();
      if (!['sent', 'accepted', 'draft'].includes(doc.status)) {
        flash(c, 'error', 'Diese Offerte kann nicht mehr in eine Rechnung umgewandelt werden.');
        return c.redirect(`${meta.path}/${doc.id}`);
      }
      const s = c.get('settings');
      const t = today();
      const id = await convertQuoteToInvoice(c.env.DB, doc, s.invoice_prefix, t, addDays(t, s.payment_terms_days), s.invoice_intro, s.invoice_footer);
      flash(c, 'success', `Rechnung aus Offerte ${doc.number} erstellt – bitte prüfen und senden.`);
      return c.redirect(`/rechnungen/${id}`);
    });
  }

  return r;
}
