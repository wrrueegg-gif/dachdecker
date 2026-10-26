/**
 * Datenzugriff (Postgres). Alle Tabellen liegen im Schema `keleo`, damit sie
 * bei Supabase nicht über die öffentliche Daten-API erreichbar sind.
 * Bewusst einfache SQL-Aufrufe ohne ORM, damit der Code nachvollziehbar bleibt.
 */
import type { Sql } from './db/sql';
import type { DocumentKind } from './lib/kinds';
import { computeTotals, type ItemInput } from './lib/totals';

// ---------- Typen ----------

export interface Settings {
  id: number;
  company_name: string;
  owner_name: string;
  street: string;
  house_no: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  vat_number: string;
  vat_enabled: number;
  default_vat_rate: number;
  iban: string;
  bank_name: string;
  payment_terms_days: number;
  quote_valid_days: number;
  invoice_prefix: string;
  quote_prefix: string;
  invoice_intro: string;
  invoice_footer: string;
  quote_intro: string;
  quote_footer: string;
  email_text_invoice: string;
  email_text_quote: string;
  email_text_reminder: string;
  updated_at: string;
}

export const SETTINGS_COLUMNS = [
  'company_name', 'owner_name', 'street', 'house_no', 'zip', 'city', 'country', 'email', 'phone', 'website',
  'vat_number', 'vat_enabled', 'default_vat_rate', 'iban', 'bank_name', 'payment_terms_days', 'quote_valid_days',
  'invoice_prefix', 'quote_prefix', 'invoice_intro', 'invoice_footer', 'quote_intro', 'quote_footer',
  'email_text_invoice', 'email_text_quote', 'email_text_reminder',
] as const;
export type SettingsColumn = (typeof SETTINGS_COLUMNS)[number];

export interface Customer {
  id: number;
  number: string;
  type: 'company' | 'private';
  company: string;
  salutation: string;
  first_name: string;
  last_name: string;
  street: string;
  house_no: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  remarks: string;
  archived: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerRow extends Customer {
  document_count: number;
  open_amount: number;
}

export type CustomerInput = Omit<Customer, 'id' | 'number' | 'archived' | 'created_at' | 'updated_at'>;

export interface CustomerNote {
  id: number;
  customer_id: number;
  body: string;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  details: string;
  customer_id: number | null;
  document_id: number | null;
  due_date: string | null;
  done: number;
  done_at: string | null;
  created_at: string;
  customer_name?: string | null;
  document_number?: string | null;
  document_kind?: DocumentKind | null;
}

export interface Document {
  id: number;
  kind: DocumentKind;
  number: string;
  customer_id: number;
  status: string;
  date: string;
  due_date: string | null;
  title: string;
  intro: string;
  footer: string;
  discount_percent: number;
  vat_enabled: number;
  currency: string;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  rounding: number;
  total: number;
  reference: string;
  source_id: number | null;
  reminder_level: number;
  reminder_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow extends Document {
  customer_name: string;
  paid: number;
}

export interface DocumentItem {
  id: number;
  document_id: number;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  amount: number;
}

export interface Payment {
  id: number;
  document_id: number;
  date: string;
  amount: number;
  method: string;
  note: string;
  created_at: string;
}

export interface DocumentFull extends DocumentRow {
  items: DocumentItem[];
  payments: Payment[];
  customer: Customer;
  source_number: string | null;
  invoice_numbers: { id: number; number: string }[];
}

export interface DocumentInput {
  customer_id: number;
  date: string;
  due_date: string | null;
  title: string;
  intro: string;
  footer: string;
  discount_percent: number;
  vat_enabled: boolean;
  currency: string;
  items: ItemInput[];
}

const PAID_SQL = `(SELECT COALESCE(SUM(p.amount), 0)::bigint FROM keleo.payments p WHERE p.document_id = d.id)`;
const CUSTOMER_NAME_SQL = `CASE WHEN c.company <> '' THEN c.company ELSE TRIM(c.first_name || ' ' || c.last_name) END`;
const NOW = `keleo.utcnow()`;

// ---------- Einstellungen ----------

export async function getSettings(db: Sql): Promise<Settings> {
  const s = await db.one<Settings>('SELECT * FROM keleo.settings WHERE id = 1');
  if (!s) throw new Error('Einstellungen fehlen – wurde die Datenbank-Migration ausgeführt?');
  return s;
}

export async function updateSettings(db: Sql, data: Partial<Record<SettingsColumn, string | number>>): Promise<void> {
  const keys = SETTINGS_COLUMNS.filter((k) => k in data);
  if (keys.length === 0) return;
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  await db.exec(`UPDATE keleo.settings SET ${sets}, updated_at = ${NOW} WHERE id = 1`, keys.map((k) => data[k]));
}

// ---------- Kunden ----------

export function customerName(c: Pick<Customer, 'company' | 'first_name' | 'last_name'>): string {
  const person = `${c.first_name} ${c.last_name}`.trim();
  return c.company !== '' ? c.company : person;
}

/** Adresszeilen für Briefkopf/Adressfeld. */
export function customerAddressLines(c: Customer): string[] {
  const person = `${c.first_name} ${c.last_name}`.trim();
  const lines: string[] = [];
  if (c.company !== '') lines.push(c.company);
  if (person !== '') lines.push(c.company !== '' && c.salutation ? `${c.salutation} ${person}` : person);
  const street = `${c.street} ${c.house_no}`.trim();
  if (street !== '') lines.push(street);
  const place = `${c.zip} ${c.city}`.trim();
  if (place !== '') lines.push(place);
  if (c.country && c.country.toUpperCase() !== 'CH') lines.push(c.country.toUpperCase());
  return lines;
}

export async function listCustomers(db: Sql, q = '', includeArchived = false): Promise<CustomerRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (!includeArchived) where.push('c.archived = 0');
  if (q !== '') {
    params.push(`%${q}%`);
    where.push(`(c.company ILIKE $1 OR c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR c.city ILIKE $1 OR c.number ILIKE $1 OR c.email ILIKE $1)`);
  }
  const sql = `
    SELECT c.*,
      (SELECT COUNT(*) FROM keleo.documents d WHERE d.customer_id = c.id) AS document_count,
      (SELECT COALESCE(SUM(d.total - ${PAID_SQL}), 0)::bigint FROM keleo.documents d WHERE d.customer_id = c.id AND d.kind = 'invoice' AND d.status = 'sent') AS open_amount
    FROM keleo.customers c
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY lower(${CUSTOMER_NAME_SQL})`;
  return db.query<CustomerRow>(sql, params);
}

export async function getCustomer(db: Sql, id: number): Promise<Customer | null> {
  return db.one<Customer>('SELECT * FROM keleo.customers WHERE id = $1', [id]);
}

export async function createCustomer(db: Sql, c: CustomerInput): Promise<number> {
  const row = await db.one<{ n: number }>('SELECT COALESCE(MAX(id), 0)::int + 1 AS n FROM keleo.customers');
  const number = 'K-' + String(row?.n ?? 1).padStart(4, '0');
  const inserted = await db.one<{ id: number }>(
    `INSERT INTO keleo.customers (number, type, company, salutation, first_name, last_name, street, house_no, zip, city, country, email, phone, remarks)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
    [number, c.type, c.company, c.salutation, c.first_name, c.last_name, c.street, c.house_no, c.zip, c.city, c.country, c.email, c.phone, c.remarks],
  );
  return inserted!.id;
}

export async function updateCustomer(db: Sql, id: number, c: CustomerInput): Promise<void> {
  await db.exec(
    `UPDATE keleo.customers SET type = $1, company = $2, salutation = $3, first_name = $4, last_name = $5, street = $6, house_no = $7, zip = $8, city = $9,
       country = $10, email = $11, phone = $12, remarks = $13, updated_at = ${NOW} WHERE id = $14`,
    [c.type, c.company, c.salutation, c.first_name, c.last_name, c.street, c.house_no, c.zip, c.city, c.country, c.email, c.phone, c.remarks, id],
  );
}

export async function setCustomerArchived(db: Sql, id: number, archived: boolean): Promise<void> {
  await db.exec(`UPDATE keleo.customers SET archived = $1, updated_at = ${NOW} WHERE id = $2`, [archived ? 1 : 0, id]);
}

/** Löscht den Kunden, wenn keine Dokumente existieren – sonst wird er archiviert. */
export async function deleteOrArchiveCustomer(db: Sql, id: number): Promise<'deleted' | 'archived'> {
  const n = await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM keleo.documents WHERE customer_id = $1', [id]);
  if ((n?.n ?? 0) > 0) {
    await setCustomerArchived(db, id, true);
    return 'archived';
  }
  await db.exec('DELETE FROM keleo.customers WHERE id = $1', [id]);
  return 'deleted';
}

export async function listNotes(db: Sql, customerId: number): Promise<CustomerNote[]> {
  return db.query<CustomerNote>('SELECT * FROM keleo.customer_notes WHERE customer_id = $1 ORDER BY created_at DESC, id DESC', [customerId]);
}

export async function addNote(db: Sql, customerId: number, body: string): Promise<void> {
  await db.exec('INSERT INTO keleo.customer_notes (customer_id, body) VALUES ($1, $2)', [customerId, body]);
}

export async function deleteNote(db: Sql, id: number): Promise<number | null> {
  const n = await db.one<{ customer_id: number }>('SELECT customer_id FROM keleo.customer_notes WHERE id = $1', [id]);
  if (!n) return null;
  await db.exec('DELETE FROM keleo.customer_notes WHERE id = $1', [id]);
  return n.customer_id;
}

// ---------- Aufgaben ----------

const TASK_SELECT = `
  SELECT t.*, ${CUSTOMER_NAME_SQL} AS customer_name, d.number AS document_number, d.kind AS document_kind
  FROM keleo.tasks t
  LEFT JOIN keleo.customers c ON c.id = t.customer_id
  LEFT JOIN keleo.documents d ON d.id = t.document_id`;

export async function listTasks(db: Sql, opts: { done?: boolean; customerId?: number; limit?: number } = {}): Promise<Task[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.done !== undefined) {
    params.push(opts.done ? 1 : 0);
    where.push(`t.done = $${params.length}`);
  }
  if (opts.customerId !== undefined) {
    params.push(opts.customerId);
    where.push(`t.customer_id = $${params.length}`);
  }
  const sql = `${TASK_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY t.done ASC, CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date ASC, t.id DESC
    ${opts.limit ? 'LIMIT ' + Math.floor(opts.limit) : ''}`;
  return db.query<Task>(sql, params);
}

export async function createTask(db: Sql, t: { title: string; details: string; customer_id: number | null; document_id: number | null; due_date: string | null }): Promise<number> {
  const row = await db.one<{ id: number }>(
    'INSERT INTO keleo.tasks (title, details, customer_id, document_id, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [t.title, t.details, t.customer_id, t.document_id, t.due_date],
  );
  return row!.id;
}

export async function setTaskDone(db: Sql, id: number, done: boolean): Promise<void> {
  await db.exec(`UPDATE keleo.tasks SET done = $1, done_at = CASE WHEN $1 = 1 THEN ${NOW} ELSE NULL END WHERE id = $2`, [done ? 1 : 0, id]);
}

export async function deleteTask(db: Sql, id: number): Promise<void> {
  await db.exec('DELETE FROM keleo.tasks WHERE id = $1', [id]);
}

// ---------- Dokumente (Offerten & Rechnungen) ----------

export async function nextNumber(db: Sql, kind: DocumentKind, year: number, prefix: string): Promise<string> {
  const row = await db.one<{ n: number }>(
    `INSERT INTO keleo.counters (kind, year, next) VALUES ($1, $2, 2)
     ON CONFLICT (kind, year) DO UPDATE SET next = keleo.counters.next + 1
     RETURNING next - 1 AS n`,
    [kind, year],
  );
  const n = row?.n ?? 1;
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
}

async function insertItems(t: Sql, documentId: number, input: DocumentInput): Promise<void> {
  const totals = computeTotals(input.items, input.discount_percent, input.vat_enabled, input.currency);
  for (const [idx, it] of totals.items.entries()) {
    await t.exec(
      'INSERT INTO keleo.document_items (document_id, position, description, quantity, unit, unit_price, vat_rate, amount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [documentId, idx + 1, it.description, it.quantity, it.unit, it.unit_price, input.vat_enabled ? it.vat_rate : 0, it.amount],
    );
  }
}

export async function createDocument(db: Sql, kind: DocumentKind, input: DocumentInput, prefix: string, sourceId: number | null = null): Promise<number> {
  const year = parseInt(input.date.slice(0, 4), 10);
  const totals = computeTotals(input.items, input.discount_percent, input.vat_enabled, input.currency);
  return db.tx(async (t) => {
    const number = await nextNumber(t, kind, year, prefix);
    const row = await t.one<{ id: number }>(
      `INSERT INTO keleo.documents (kind, number, customer_id, status, date, due_date, title, intro, footer, discount_percent, vat_enabled, currency,
         subtotal, discount_amount, vat_amount, rounding, total, source_id)
       VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id`,
      [
        kind, number, input.customer_id, input.date, input.due_date, input.title, input.intro, input.footer, input.discount_percent,
        input.vat_enabled ? 1 : 0, input.currency, totals.subtotal, totals.discount_amount, totals.vat_amount, totals.rounding, totals.total, sourceId,
      ],
    );
    await insertItems(t, row!.id, input);
    return row!.id;
  });
}

export async function updateDocument(db: Sql, id: number, input: DocumentInput): Promise<void> {
  const totals = computeTotals(input.items, input.discount_percent, input.vat_enabled, input.currency);
  await db.tx(async (t) => {
    await t.exec(
      `UPDATE keleo.documents SET customer_id = $1, date = $2, due_date = $3, title = $4, intro = $5, footer = $6, discount_percent = $7, vat_enabled = $8, currency = $9,
         subtotal = $10, discount_amount = $11, vat_amount = $12, rounding = $13, total = $14, updated_at = ${NOW} WHERE id = $15`,
      [
        input.customer_id, input.date, input.due_date, input.title, input.intro, input.footer, input.discount_percent, input.vat_enabled ? 1 : 0,
        input.currency, totals.subtotal, totals.discount_amount, totals.vat_amount, totals.rounding, totals.total, id,
      ],
    );
    await t.exec('DELETE FROM keleo.document_items WHERE document_id = $1', [id]);
    await insertItems(t, id, input);
  });
}

export async function listDocuments(
  db: Sql,
  kind: DocumentKind,
  filter: { status?: string; customerId?: number; q?: string; limit?: number; today?: string } = {},
): Promise<DocumentRow[]> {
  const params: unknown[] = [kind];
  const where: string[] = ['d.kind = $1'];
  if (filter.customerId !== undefined) {
    params.push(filter.customerId);
    where.push(`d.customer_id = $${params.length}`);
  }
  if (filter.q) {
    params.push(`%${filter.q}%`);
    where.push(`(d.number ILIKE $${params.length} OR d.title ILIKE $${params.length} OR ${CUSTOMER_NAME_SQL} ILIKE $${params.length})`);
  }
  if (filter.status && filter.status !== 'all') {
    if (filter.status === 'overdue') {
      params.push(filter.today ?? new Date().toISOString().slice(0, 10));
      where.push(`d.status = 'sent' AND d.due_date < $${params.length}`);
    } else if (filter.status === 'open') where.push(`d.status = 'sent'`);
    else {
      params.push(filter.status);
      where.push(`d.status = $${params.length}`);
    }
  }
  const sql = `
    SELECT d.*, ${CUSTOMER_NAME_SQL} AS customer_name, ${PAID_SQL} AS paid
    FROM keleo.documents d JOIN keleo.customers c ON c.id = d.customer_id
    WHERE ${where.join(' AND ')}
    ORDER BY d.date DESC, d.id DESC
    ${filter.limit ? 'LIMIT ' + Math.floor(filter.limit) : ''}`;
  return db.query<DocumentRow>(sql, params);
}

export async function getDocument(db: Sql, id: number): Promise<DocumentFull | null> {
  const doc = await db.one<DocumentRow>(
    `SELECT d.*, ${CUSTOMER_NAME_SQL} AS customer_name, ${PAID_SQL} AS paid FROM keleo.documents d JOIN keleo.customers c ON c.id = d.customer_id WHERE d.id = $1`,
    [id],
  );
  if (!doc) return null;
  const [items, payments, customer, source, invoices] = await Promise.all([
    db.query<DocumentItem>('SELECT * FROM keleo.document_items WHERE document_id = $1 ORDER BY position', [id]),
    db.query<Payment>('SELECT * FROM keleo.payments WHERE document_id = $1 ORDER BY date DESC, id DESC', [id]),
    getCustomer(db, doc.customer_id),
    doc.source_id ? db.one<{ number: string }>('SELECT number FROM keleo.documents WHERE id = $1', [doc.source_id]) : Promise.resolve(null),
    db.query<{ id: number; number: string }>(`SELECT id, number FROM keleo.documents WHERE source_id = $1 AND kind = 'invoice' ORDER BY id`, [id]),
  ]);
  if (!customer) return null;
  return { ...doc, items, payments, customer, source_number: source?.number ?? null, invoice_numbers: invoices };
}

export async function deleteDocument(db: Sql, id: number): Promise<void> {
  await db.exec('DELETE FROM keleo.documents WHERE id = $1', [id]);
}

export async function setDocumentStatus(db: Sql, id: number, status: string): Promise<void> {
  await db.exec(
    `UPDATE keleo.documents SET status = $1,
       sent_at = CASE WHEN $1 = 'sent' AND sent_at IS NULL THEN ${NOW} ELSE sent_at END,
       paid_at = CASE WHEN $1 = 'paid' THEN COALESCE(paid_at, substr(${NOW}, 1, 10)) WHEN $1 IN ('draft', 'sent') THEN NULL ELSE paid_at END,
       updated_at = ${NOW}
     WHERE id = $2`,
    [status, id],
  );
}

export async function setReference(db: Sql, id: number, reference: string): Promise<void> {
  await db.exec('UPDATE keleo.documents SET reference = $1 WHERE id = $2', [reference, id]);
}

export async function setReminder(db: Sql, id: number, level: number, dateIso: string): Promise<void> {
  await db.exec(`UPDATE keleo.documents SET reminder_level = $1, reminder_at = $2, updated_at = ${NOW} WHERE id = $3`, [level, dateIso, id]);
}

export async function setDueDate(db: Sql, id: number, dueDate: string): Promise<void> {
  await db.exec(`UPDATE keleo.documents SET due_date = $1, updated_at = ${NOW} WHERE id = $2`, [dueDate, id]);
}

function toInput(doc: DocumentFull, overrides: Partial<DocumentInput>): DocumentInput {
  return {
    customer_id: doc.customer_id,
    date: doc.date,
    due_date: doc.due_date,
    title: doc.title,
    intro: doc.intro,
    footer: doc.footer,
    discount_percent: doc.discount_percent,
    vat_enabled: doc.vat_enabled === 1,
    currency: doc.currency,
    items: doc.items.map((i) => ({ description: i.description, quantity: i.quantity, unit: i.unit, unit_price: i.unit_price, vat_rate: i.vat_rate })),
    ...overrides,
  };
}

/** Kopiert ein Dokument als neuen Entwurf mit heutigem Datum. */
export async function copyDocument(db: Sql, doc: DocumentFull, prefix: string, dateIso: string, dueIso: string | null): Promise<number> {
  return createDocument(db, doc.kind, toInput(doc, { date: dateIso, due_date: dueIso }), prefix);
}

/** Erstellt aus einer Offerte eine Rechnung (Entwurf) und markiert die Offerte als verrechnet. */
export async function convertQuoteToInvoice(db: Sql, quote: DocumentFull, prefix: string, dateIso: string, dueIso: string, intro: string, footer: string): Promise<number> {
  const id = await createDocument(db, 'invoice', toInput(quote, { date: dateIso, due_date: dueIso, intro, footer }), prefix, quote.id);
  await db.exec(`UPDATE keleo.documents SET status = 'invoiced', updated_at = ${NOW} WHERE id = $1`, [quote.id]);
  return id;
}

// ---------- Zahlungen ----------

export async function addPayment(db: Sql, documentId: number, p: { date: string; amount: number; method: string; note: string }): Promise<void> {
  await db.exec('INSERT INTO keleo.payments (document_id, date, amount, method, note) VALUES ($1, $2, $3, $4, $5)', [documentId, p.date, p.amount, p.method, p.note]);
  await recalcPaymentStatus(db, documentId);
}

export async function deletePayment(db: Sql, paymentId: number): Promise<number | null> {
  const p = await db.one<{ document_id: number }>('SELECT document_id FROM keleo.payments WHERE id = $1', [paymentId]);
  if (!p) return null;
  await db.exec('DELETE FROM keleo.payments WHERE id = $1', [paymentId]);
  await recalcPaymentStatus(db, p.document_id);
  return p.document_id;
}

/** Setzt den Status auf "bezahlt", sobald die Zahlungen das Total decken, bzw. zurück auf "gesendet". */
export async function recalcPaymentStatus(db: Sql, documentId: number): Promise<void> {
  const row = await db.one<{ total: number; status: string; paid: number; last_date: string | null }>(
    `SELECT d.total, d.status, ${PAID_SQL} AS paid, (SELECT MAX(p.date) FROM keleo.payments p WHERE p.document_id = d.id) AS last_date FROM keleo.documents d WHERE d.id = $1`,
    [documentId],
  );
  if (!row) return;
  if (row.paid >= row.total && row.total > 0 && row.status !== 'cancelled') {
    await db.exec(`UPDATE keleo.documents SET status = 'paid', paid_at = $1, sent_at = COALESCE(sent_at, ${NOW}), updated_at = ${NOW} WHERE id = $2`, [row.last_date, documentId]);
  } else if (row.status === 'paid') {
    await db.exec(`UPDATE keleo.documents SET status = 'sent', paid_at = NULL, updated_at = ${NOW} WHERE id = $1`, [documentId]);
  }
}

// ---------- Dashboard ----------

export interface DashboardStats {
  open_amount: number;
  open_count: number;
  overdue_amount: number;
  overdue_count: number;
  quotes_amount: number;
  quotes_count: number;
  paid_year: number;
  invoiced_year: number;
  open_tasks: number;
  customer_count: number;
}

export async function getDashboardStats(db: Sql, todayIso: string): Promise<DashboardStats> {
  const yearStart = todayIso.slice(0, 4) + '-01-01';
  const row = await db.one<DashboardStats>(
    `SELECT
      (SELECT COALESCE(SUM(d.total - ${PAID_SQL}), 0)::bigint FROM keleo.documents d WHERE d.kind = 'invoice' AND d.status = 'sent') AS open_amount,
      (SELECT COUNT(*) FROM keleo.documents d WHERE d.kind = 'invoice' AND d.status = 'sent') AS open_count,
      (SELECT COALESCE(SUM(d.total - ${PAID_SQL}), 0)::bigint FROM keleo.documents d WHERE d.kind = 'invoice' AND d.status = 'sent' AND d.due_date < $1) AS overdue_amount,
      (SELECT COUNT(*) FROM keleo.documents d WHERE d.kind = 'invoice' AND d.status = 'sent' AND d.due_date < $1) AS overdue_count,
      (SELECT COALESCE(SUM(total), 0)::bigint FROM keleo.documents WHERE kind = 'quote' AND status = 'sent') AS quotes_amount,
      (SELECT COUNT(*) FROM keleo.documents WHERE kind = 'quote' AND status = 'sent') AS quotes_count,
      (SELECT COALESCE(SUM(amount), 0)::bigint FROM keleo.payments WHERE date >= $2) AS paid_year,
      (SELECT COALESCE(SUM(total), 0)::bigint FROM keleo.documents WHERE kind = 'invoice' AND status IN ('sent', 'paid') AND date >= $2) AS invoiced_year,
      (SELECT COUNT(*) FROM keleo.tasks WHERE done = 0) AS open_tasks,
      (SELECT COUNT(*) FROM keleo.customers WHERE archived = 0) AS customer_count`,
    [todayIso, yearStart],
  );
  return row!;
}

export interface Todo {
  type: 'overdue' | 'quote_expired' | 'quote_followup' | 'task' | 'draft';
  label: string;
  detail: string;
  href: string;
  due: string | null;
  amount: number | null;
  urgency: 'high' | 'medium' | 'low';
}

/** Stellt die "Zu erledigen"-Liste des Dashboards zusammen. */
export async function getTodos(db: Sql, todayIso: string): Promise<Todo[]> {
  const todos: Todo[] = [];
  const base = `SELECT d.*, ${CUSTOMER_NAME_SQL} AS customer_name, ${PAID_SQL} AS paid FROM keleo.documents d JOIN keleo.customers c ON c.id = d.customer_id`;

  const overdue = await db.query<DocumentRow>(`${base} WHERE d.kind = 'invoice' AND d.status = 'sent' AND d.due_date < $1 ORDER BY d.due_date`, [todayIso]);
  for (const d of overdue) {
    const days = Math.round((Date.parse(todayIso) - Date.parse(d.due_date!)) / 86400000);
    const next = d.reminder_level === 0 ? 'Zahlungserinnerung senden' : d.reminder_level === 1 ? '1. Mahnung senden' : d.reminder_level === 2 ? '2. Mahnung senden' : 'Weiteres Vorgehen prüfen (Betreibung?)';
    todos.push({ type: 'overdue', label: `Rechnung ${d.number} · ${d.customer_name}`, detail: `${days} Tage überfällig · ${next}`, href: `/rechnungen/${d.id}`, due: d.due_date, amount: d.total - d.paid, urgency: 'high' });
  }

  const quotes = await db.query<DocumentRow>(`${base} WHERE d.kind = 'quote' AND d.status = 'sent' ORDER BY d.due_date`);
  for (const d of quotes) {
    const expired = !!d.due_date && d.due_date < todayIso;
    const sentDays = d.sent_at ? Math.round((Date.parse(todayIso) - Date.parse(d.sent_at.slice(0, 10))) / 86400000) : 0;
    if (expired) {
      todos.push({ type: 'quote_expired', label: `Offerte ${d.number} · ${d.customer_name}`, detail: 'Gültigkeit abgelaufen · nachfassen oder abschliessen', href: `/offerten/${d.id}`, due: d.due_date, amount: d.total, urgency: 'medium' });
    } else if (sentDays >= 10) {
      todos.push({ type: 'quote_followup', label: `Offerte ${d.number} · ${d.customer_name}`, detail: `Seit ${sentDays} Tagen ohne Antwort · nachfragen`, href: `/offerten/${d.id}`, due: d.due_date, amount: d.total, urgency: 'low' });
    }
  }

  const tasks = await listTasks(db, { done: false });
  for (const t of tasks) {
    const late = !!t.due_date && t.due_date < todayIso;
    const soon = !!t.due_date && !late && Math.round((Date.parse(t.due_date!) - Date.parse(todayIso)) / 86400000) <= 7;
    todos.push({
      type: 'task',
      label: t.title,
      detail: [t.customer_name, t.document_number].filter(Boolean).join(' · ') || 'Aufgabe',
      href: t.customer_id ? `/kunden/${t.customer_id}` : '/aufgaben',
      due: t.due_date,
      amount: null,
      urgency: late ? 'high' : soon ? 'medium' : 'low',
    });
  }

  const weekAgo = new Date(Date.parse(todayIso) - 7 * 86400000).toISOString().slice(0, 10) + ' 00:00:00';
  const drafts = await db.query<DocumentRow>(`${base} WHERE d.status = 'draft' AND d.created_at < $1 ORDER BY d.created_at`, [weekAgo]);
  for (const d of drafts) {
    const meta = d.kind === 'quote' ? 'Offerte' : 'Rechnung';
    todos.push({ type: 'draft', label: `${meta} ${d.number} · ${d.customer_name}`, detail: 'Entwurf seit über einer Woche · fertigstellen oder löschen', href: `${d.kind === 'quote' ? '/offerten' : '/rechnungen'}/${d.id}`, due: null, amount: d.total, urgency: 'low' });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  todos.sort((a, b) => rank[a.urgency] - rank[b.urgency] || (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  return todos;
}
