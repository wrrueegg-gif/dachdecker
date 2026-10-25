/**
 * Datenzugriff auf Cloudflare D1 (SQLite). Alle Funktionen sind bewusst
 * einfache SQL-Aufrufe ohne ORM, damit der Code leicht nachvollziehbar bleibt.
 */
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

const PAID_SQL = `(SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.document_id = d.id)`;
const CUSTOMER_NAME_SQL = `CASE WHEN c.company <> '' THEN c.company ELSE TRIM(c.first_name || ' ' || c.last_name) END`;

// ---------- Einstellungen ----------

export async function getSettings(db: D1Database): Promise<Settings> {
  const s = await db.prepare('SELECT * FROM settings WHERE id = 1').first<Settings>();
  if (!s) throw new Error('Einstellungen fehlen – wurde die Migration ausgeführt?');
  return s;
}

export async function updateSettings(db: D1Database, data: Partial<Record<SettingsColumn, string | number>>): Promise<void> {
  const keys = SETTINGS_COLUMNS.filter((k) => k in data);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  await db
    .prepare(`UPDATE settings SET ${sets}, updated_at = datetime('now') WHERE id = 1`)
    .bind(...keys.map((k) => data[k]))
    .run();
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

export async function listCustomers(db: D1Database, q = '', includeArchived = false): Promise<CustomerRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (!includeArchived) where.push('c.archived = 0');
  if (q !== '') {
    where.push(`(c.company LIKE ?1 OR c.first_name LIKE ?1 OR c.last_name LIKE ?1 OR c.city LIKE ?1 OR c.number LIKE ?1 OR c.email LIKE ?1)`);
    params.push(`%${q}%`);
  }
  const sql = `
    SELECT c.*,
      (SELECT COUNT(*) FROM documents d WHERE d.customer_id = c.id) AS document_count,
      (SELECT COALESCE(SUM(d.total - ${PAID_SQL}), 0) FROM documents d WHERE d.customer_id = c.id AND d.kind = 'invoice' AND d.status = 'sent') AS open_amount
    FROM customers c
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${CUSTOMER_NAME_SQL} COLLATE NOCASE`;
  const r = await db.prepare(sql).bind(...params).all<CustomerRow>();
  return r.results;
}

export async function getCustomer(db: D1Database, id: number): Promise<Customer | null> {
  return db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<Customer>();
}

export async function createCustomer(db: D1Database, c: CustomerInput): Promise<number> {
  const row = await db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM customers').first<{ n: number }>();
  const number = 'K-' + String(row?.n ?? 1).padStart(4, '0');
  const r = await db
    .prepare(
      `INSERT INTO customers (number, type, company, salutation, first_name, last_name, street, house_no, zip, city, country, email, phone, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(number, c.type, c.company, c.salutation, c.first_name, c.last_name, c.street, c.house_no, c.zip, c.city, c.country, c.email, c.phone, c.remarks)
    .run();
  return Number(r.meta.last_row_id);
}

export async function updateCustomer(db: D1Database, id: number, c: CustomerInput): Promise<void> {
  await db
    .prepare(
      `UPDATE customers SET type = ?, company = ?, salutation = ?, first_name = ?, last_name = ?, street = ?, house_no = ?, zip = ?, city = ?,
       country = ?, email = ?, phone = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(c.type, c.company, c.salutation, c.first_name, c.last_name, c.street, c.house_no, c.zip, c.city, c.country, c.email, c.phone, c.remarks, id)
    .run();
}

export async function setCustomerArchived(db: D1Database, id: number, archived: boolean): Promise<void> {
  await db.prepare(`UPDATE customers SET archived = ?, updated_at = datetime('now') WHERE id = ?`).bind(archived ? 1 : 0, id).run();
}

/** Löscht den Kunden, wenn keine Dokumente existieren – sonst wird er archiviert. */
export async function deleteOrArchiveCustomer(db: D1Database, id: number): Promise<'deleted' | 'archived'> {
  const n = await db.prepare('SELECT COUNT(*) AS n FROM documents WHERE customer_id = ?').bind(id).first<{ n: number }>();
  if ((n?.n ?? 0) > 0) {
    await setCustomerArchived(db, id, true);
    return 'archived';
  }
  await db.prepare('DELETE FROM customers WHERE id = ?').bind(id).run();
  return 'deleted';
}

export async function listNotes(db: D1Database, customerId: number): Promise<CustomerNote[]> {
  const r = await db.prepare('SELECT * FROM customer_notes WHERE customer_id = ? ORDER BY created_at DESC, id DESC').bind(customerId).all<CustomerNote>();
  return r.results;
}

export async function addNote(db: D1Database, customerId: number, body: string): Promise<void> {
  await db.prepare('INSERT INTO customer_notes (customer_id, body) VALUES (?, ?)').bind(customerId, body).run();
}

export async function deleteNote(db: D1Database, id: number): Promise<number | null> {
  const n = await db.prepare('SELECT customer_id FROM customer_notes WHERE id = ?').bind(id).first<{ customer_id: number }>();
  if (!n) return null;
  await db.prepare('DELETE FROM customer_notes WHERE id = ?').bind(id).run();
  return n.customer_id;
}

// ---------- Aufgaben ----------

const TASK_SELECT = `
  SELECT t.*, ${CUSTOMER_NAME_SQL} AS customer_name, d.number AS document_number, d.kind AS document_kind
  FROM tasks t
  LEFT JOIN customers c ON c.id = t.customer_id
  LEFT JOIN documents d ON d.id = t.document_id`;

export async function listTasks(db: D1Database, opts: { done?: boolean; customerId?: number; limit?: number } = {}): Promise<Task[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.done !== undefined) {
    where.push('t.done = ?');
    params.push(opts.done ? 1 : 0);
  }
  if (opts.customerId !== undefined) {
    where.push('t.customer_id = ?');
    params.push(opts.customerId);
  }
  const sql = `${TASK_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY t.done ASC, CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date ASC, t.id DESC
    ${opts.limit ? 'LIMIT ' + Math.floor(opts.limit) : ''}`;
  const r = await db.prepare(sql).bind(...params).all<Task>();
  return r.results;
}

export async function createTask(db: D1Database, t: { title: string; details: string; customer_id: number | null; document_id: number | null; due_date: string | null }): Promise<number> {
  const r = await db
    .prepare('INSERT INTO tasks (title, details, customer_id, document_id, due_date) VALUES (?, ?, ?, ?, ?)')
    .bind(t.title, t.details, t.customer_id, t.document_id, t.due_date)
    .run();
  return Number(r.meta.last_row_id);
}

export async function setTaskDone(db: D1Database, id: number, done: boolean): Promise<void> {
  await db.prepare(`UPDATE tasks SET done = ?, done_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END WHERE id = ?`).bind(done ? 1 : 0, done ? 1 : 0, id).run();
}

export async function deleteTask(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
}

// ---------- Dokumente (Offerten & Rechnungen) ----------

export async function nextNumber(db: D1Database, kind: DocumentKind, year: number, prefix: string): Promise<string> {
  const row = await db
    .prepare(
      `INSERT INTO counters (kind, year, next) VALUES (?, ?, 2)
       ON CONFLICT(kind, year) DO UPDATE SET next = next + 1
       RETURNING next - 1 AS n`,
    )
    .bind(kind, year)
    .first<{ n: number }>();
  const n = row?.n ?? 1;
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
}

function itemStatements(db: D1Database, documentId: number, input: DocumentInput) {
  const totals = computeTotals(input.items, input.discount_percent, input.vat_enabled, input.currency);
  const stmts = totals.items.map((it, idx) =>
    db
      .prepare('INSERT INTO document_items (document_id, position, description, quantity, unit, unit_price, vat_rate, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(documentId, idx + 1, it.description, it.quantity, it.unit, it.unit_price, input.vat_enabled ? it.vat_rate : 0, it.amount),
  );
  return { totals, stmts };
}

export async function createDocument(db: D1Database, kind: DocumentKind, input: DocumentInput, prefix: string, sourceId: number | null = null): Promise<number> {
  const year = parseInt(input.date.slice(0, 4), 10);
  const number = await nextNumber(db, kind, year, prefix);
  const totals = computeTotals(input.items, input.discount_percent, input.vat_enabled, input.currency);
  const r = await db
    .prepare(
      `INSERT INTO documents (kind, number, customer_id, status, date, due_date, title, intro, footer, discount_percent, vat_enabled, currency,
         subtotal, discount_amount, vat_amount, rounding, total, source_id)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      kind, number, input.customer_id, input.date, input.due_date, input.title, input.intro, input.footer, input.discount_percent,
      input.vat_enabled ? 1 : 0, input.currency, totals.subtotal, totals.discount_amount, totals.vat_amount, totals.rounding, totals.total, sourceId,
    )
    .run();
  const id = Number(r.meta.last_row_id);
  const { stmts } = itemStatements(db, id, input);
  if (stmts.length) await db.batch(stmts);
  return id;
}

export async function updateDocument(db: D1Database, id: number, input: DocumentInput): Promise<void> {
  const { totals, stmts } = itemStatements(db, id, input);
  await db.batch([
    db
      .prepare(
        `UPDATE documents SET customer_id = ?, date = ?, due_date = ?, title = ?, intro = ?, footer = ?, discount_percent = ?, vat_enabled = ?, currency = ?,
           subtotal = ?, discount_amount = ?, vat_amount = ?, rounding = ?, total = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(
        input.customer_id, input.date, input.due_date, input.title, input.intro, input.footer, input.discount_percent, input.vat_enabled ? 1 : 0,
        input.currency, totals.subtotal, totals.discount_amount, totals.vat_amount, totals.rounding, totals.total, id,
      ),
    db.prepare('DELETE FROM document_items WHERE document_id = ?').bind(id),
    ...stmts,
  ]);
}

export async function listDocuments(db: D1Database, kind: DocumentKind, filter: { status?: string; customerId?: number; q?: string; limit?: number } = {}): Promise<DocumentRow[]> {
  const where: string[] = ['d.kind = ?'];
  const params: unknown[] = [kind];
  if (filter.customerId !== undefined) {
    where.push('d.customer_id = ?');
    params.push(filter.customerId);
  }
  if (filter.q) {
    where.push(`(d.number LIKE ? OR d.title LIKE ? OR ${CUSTOMER_NAME_SQL} LIKE ?)`);
    params.push(`%${filter.q}%`, `%${filter.q}%`, `%${filter.q}%`);
  }
  if (filter.status && filter.status !== 'all') {
    if (filter.status === 'overdue') where.push(`d.status = 'sent' AND d.due_date < date('now')`);
    else if (filter.status === 'open') where.push(`d.status = 'sent'`);
    else {
      where.push('d.status = ?');
      params.push(filter.status);
    }
  }
  const sql = `
    SELECT d.*, ${CUSTOMER_NAME_SQL} AS customer_name, ${PAID_SQL} AS paid
    FROM documents d JOIN customers c ON c.id = d.customer_id
    WHERE ${where.join(' AND ')}
    ORDER BY d.date DESC, d.id DESC
    ${filter.limit ? 'LIMIT ' + Math.floor(filter.limit) : ''}`;
  const r = await db.prepare(sql).bind(...params).all<DocumentRow>();
  return r.results;
}

export async function getDocument(db: D1Database, id: number): Promise<DocumentFull | null> {
  const doc = await db
    .prepare(`SELECT d.*, ${CUSTOMER_NAME_SQL} AS customer_name, ${PAID_SQL} AS paid FROM documents d JOIN customers c ON c.id = d.customer_id WHERE d.id = ?`)
    .bind(id)
    .first<DocumentRow>();
  if (!doc) return null;
  const [items, payments, customer, source, invoices] = await Promise.all([
    db.prepare('SELECT * FROM document_items WHERE document_id = ? ORDER BY position').bind(id).all<DocumentItem>(),
    db.prepare('SELECT * FROM payments WHERE document_id = ? ORDER BY date DESC, id DESC').bind(id).all<Payment>(),
    getCustomer(db, doc.customer_id),
    doc.source_id ? db.prepare('SELECT number FROM documents WHERE id = ?').bind(doc.source_id).first<{ number: string }>() : Promise.resolve(null),
    db.prepare(`SELECT id, number FROM documents WHERE source_id = ? AND kind = 'invoice' ORDER BY id`).bind(id).all<{ id: number; number: string }>(),
  ]);
  if (!customer) return null;
  return { ...doc, items: items.results, payments: payments.results, customer, source_number: source?.number ?? null, invoice_numbers: invoices.results };
}

export async function deleteDocument(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
}

export async function setDocumentStatus(db: D1Database, id: number, status: string): Promise<void> {
  await db
    .prepare(
      `UPDATE documents SET status = ?,
         sent_at = CASE WHEN ? = 'sent' AND sent_at IS NULL THEN datetime('now') ELSE sent_at END,
         paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, date('now')) WHEN ? IN ('draft', 'sent') THEN NULL ELSE paid_at END,
         updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(status, status, status, status, id)
    .run();
}

export async function setReference(db: D1Database, id: number, reference: string): Promise<void> {
  await db.prepare('UPDATE documents SET reference = ? WHERE id = ?').bind(reference, id).run();
}

export async function setReminder(db: D1Database, id: number, level: number, dateIso: string): Promise<void> {
  await db.prepare(`UPDATE documents SET reminder_level = ?, reminder_at = ?, updated_at = datetime('now') WHERE id = ?`).bind(level, dateIso, id).run();
}

export async function setDueDate(db: D1Database, id: number, dueDate: string): Promise<void> {
  await db.prepare(`UPDATE documents SET due_date = ?, updated_at = datetime('now') WHERE id = ?`).bind(dueDate, id).run();
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
export async function copyDocument(db: D1Database, doc: DocumentFull, prefix: string, dateIso: string, dueIso: string | null): Promise<number> {
  return createDocument(db, doc.kind, toInput(doc, { date: dateIso, due_date: dueIso }), prefix);
}

/** Erstellt aus einer Offerte eine Rechnung (Entwurf) und markiert die Offerte als verrechnet. */
export async function convertQuoteToInvoice(db: D1Database, quote: DocumentFull, prefix: string, dateIso: string, dueIso: string, intro: string, footer: string): Promise<number> {
  const id = await createDocument(db, 'invoice', toInput(quote, { date: dateIso, due_date: dueIso, intro, footer }), prefix, quote.id);
  await db.prepare(`UPDATE documents SET status = 'invoiced', updated_at = datetime('now') WHERE id = ?`).bind(quote.id).run();
  return id;
}

// ---------- Zahlungen ----------

export async function addPayment(db: D1Database, documentId: number, p: { date: string; amount: number; method: string; note: string }): Promise<void> {
  await db.prepare('INSERT INTO payments (document_id, date, amount, method, note) VALUES (?, ?, ?, ?, ?)').bind(documentId, p.date, p.amount, p.method, p.note).run();
  await recalcPaymentStatus(db, documentId);
}

export async function deletePayment(db: D1Database, paymentId: number): Promise<number | null> {
  const p = await db.prepare('SELECT document_id FROM payments WHERE id = ?').bind(paymentId).first<{ document_id: number }>();
  if (!p) return null;
  await db.prepare('DELETE FROM payments WHERE id = ?').bind(paymentId).run();
  await recalcPaymentStatus(db, p.document_id);
  return p.document_id;
}

/** Setzt den Status auf "bezahlt", sobald die Zahlungen das Total decken, bzw. zurück auf "gesendet". */
export async function recalcPaymentStatus(db: D1Database, documentId: number): Promise<void> {
  const row = await db
    .prepare(`SELECT d.total, d.status, ${PAID_SQL} AS paid, (SELECT MAX(date) FROM payments p WHERE p.document_id = d.id) AS last_date FROM documents d WHERE d.id = ?`)
    .bind(documentId)
    .first<{ total: number; status: string; paid: number; last_date: string | null }>();
  if (!row) return;
  if (row.paid >= row.total && row.total > 0 && row.status !== 'cancelled') {
    await db.prepare(`UPDATE documents SET status = 'paid', paid_at = ?, sent_at = COALESCE(sent_at, datetime('now')), updated_at = datetime('now') WHERE id = ?`).bind(row.last_date, documentId).run();
  } else if (row.status === 'paid') {
    await db.prepare(`UPDATE documents SET status = 'sent', paid_at = NULL, updated_at = datetime('now') WHERE id = ?`).bind(documentId).run();
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

export async function getDashboardStats(db: D1Database, todayIso: string): Promise<DashboardStats> {
  const yearStart = todayIso.slice(0, 4) + '-01-01';
  const row = await db
    .prepare(
      `SELECT
        (SELECT COALESCE(SUM(d.total - ${PAID_SQL}), 0) FROM documents d WHERE d.kind = 'invoice' AND d.status = 'sent') AS open_amount,
        (SELECT COUNT(*) FROM documents d WHERE d.kind = 'invoice' AND d.status = 'sent') AS open_count,
        (SELECT COALESCE(SUM(d.total - ${PAID_SQL}), 0) FROM documents d WHERE d.kind = 'invoice' AND d.status = 'sent' AND d.due_date < ?1) AS overdue_amount,
        (SELECT COUNT(*) FROM documents d WHERE d.kind = 'invoice' AND d.status = 'sent' AND d.due_date < ?1) AS overdue_count,
        (SELECT COALESCE(SUM(total), 0) FROM documents WHERE kind = 'quote' AND status = 'sent') AS quotes_amount,
        (SELECT COUNT(*) FROM documents WHERE kind = 'quote' AND status = 'sent') AS quotes_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE date >= ?2) AS paid_year,
        (SELECT COALESCE(SUM(total), 0) FROM documents WHERE kind = 'invoice' AND status IN ('sent', 'paid') AND date >= ?2) AS invoiced_year,
        (SELECT COUNT(*) FROM tasks WHERE done = 0) AS open_tasks,
        (SELECT COUNT(*) FROM customers WHERE archived = 0) AS customer_count`,
    )
    .bind(todayIso, yearStart)
    .first<DashboardStats>();
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
export async function getTodos(db: D1Database, todayIso: string): Promise<Todo[]> {
  const todos: Todo[] = [];
  const base = `SELECT d.*, ${CUSTOMER_NAME_SQL} AS customer_name, ${PAID_SQL} AS paid FROM documents d JOIN customers c ON c.id = d.customer_id`;

  const overdue = await db.prepare(`${base} WHERE d.kind = 'invoice' AND d.status = 'sent' AND d.due_date < ?1 ORDER BY d.due_date`).bind(todayIso).all<DocumentRow>();
  for (const d of overdue.results) {
    const days = Math.round((Date.parse(todayIso) - Date.parse(d.due_date!)) / 86400000);
    const next = d.reminder_level === 0 ? 'Zahlungserinnerung senden' : d.reminder_level === 1 ? '1. Mahnung senden' : d.reminder_level === 2 ? '2. Mahnung senden' : 'Weiteres Vorgehen prüfen (Betreibung?)';
    todos.push({ type: 'overdue', label: `Rechnung ${d.number} · ${d.customer_name}`, detail: `${days} Tage überfällig · ${next}`, href: `/rechnungen/${d.id}`, due: d.due_date, amount: d.total - d.paid, urgency: 'high' });
  }

  const quotes = await db.prepare(`${base} WHERE d.kind = 'quote' AND d.status = 'sent' ORDER BY d.due_date`).all<DocumentRow>();
  for (const d of quotes.results) {
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

  const drafts = await db.prepare(`${base} WHERE d.status = 'draft' AND d.created_at < datetime('now', '-7 days') ORDER BY d.created_at`).all<DocumentRow>();
  for (const d of drafts.results) {
    const meta = d.kind === 'quote' ? 'Offerte' : 'Rechnung';
    todos.push({ type: 'draft', label: `${meta} ${d.number} · ${d.customer_name}`, detail: 'Entwurf seit über einer Woche · fertigstellen oder löschen', href: `${d.kind === 'quote' ? '/offerten' : '/rechnungen'}/${d.id}`, due: null, amount: d.total, urgency: 'low' });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  todos.sort((a, b) => rank[a.urgency] - rank[b.urgency] || (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  return todos;
}
