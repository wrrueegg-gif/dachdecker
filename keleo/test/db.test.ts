import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addNote, addPayment, convertQuoteToInvoice, createCustomer, createDocument, createTask, deleteOrArchiveCustomer, getDashboardStats,
  getDocument, getSettings, getTodos, listCustomers, listDocuments, listNotes, setDocumentStatus, setReminder, updateDocument, updateSettings,
} from '../src/db';
import { migrate } from '../src/db/migrations';
import { createPgliteDriver, toDollar, type Sql } from '../src/db/sql';

let db: Sql;

beforeAll(async () => {
  db = await createPgliteDriver();
  const applied = await migrate(db);
  expect(applied).toEqual(['0001_init']);
  expect(await migrate(db)).toEqual([]);
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe('SQL-Hilfen', () => {
  it('wandelt ?-Platzhalter um', () => {
    expect(toDollar('SELECT ? , ? FROM t WHERE x = ?')).toBe('SELECT $1 , $2 FROM t WHERE x = $3');
    expect(toDollar("SELECT '?' , $1 FROM t")).toBe("SELECT '?' , $1 FROM t");
  });
});

describe('Datenbank (PGlite)', () => {
  const customer = {
    type: 'company' as const, company: 'Hauswartung Zürich AG', salutation: 'Frau', first_name: 'Petra', last_name: 'Keller',
    street: 'Bahnhofstrasse', house_no: '5', zip: '8001', city: 'Zürich', country: 'CH', email: 'petra@example.ch', phone: '', remarks: 'Schlüssel beim Hauswart',
  };
  const items = [
    { description: 'Arbeit', quantity: 2, unit: 'Std.', unit_price: 12000, vat_rate: 8.1 },
    { description: 'Material', quantity: 1, unit: 'Stk.', unit_price: 5000, vat_rate: 8.1 },
  ];
  let customerId = 0;
  let quoteId = 0;
  let invoiceId = 0;

  it('Einstellungen lesen und schreiben', async () => {
    const s = await getSettings(db);
    expect(s.id).toBe(1);
    expect(s.default_vat_rate).toBe(8.1);
    await updateSettings(db, { company_name: 'Muster GmbH', iban: 'CH4431999123000889012', vat_enabled: 1 });
    const s2 = await getSettings(db);
    expect(s2.company_name).toBe('Muster GmbH');
    expect(s2.vat_enabled).toBe(1);
    expect(s2.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('Kunden anlegen, suchen, Notizen', async () => {
    customerId = await createCustomer(db, customer);
    expect(customerId).toBeGreaterThan(0);
    const list = await listCustomers(db, 'zürich');
    expect(list).toHaveLength(1);
    expect(list[0].number).toBe('K-0001');
    expect(list[0].document_count).toBe(0);
    expect(typeof list[0].document_count).toBe('number');
    await addNote(db, customerId, 'Telefonat');
    expect((await listNotes(db, customerId))[0].body).toBe('Telefonat');
  });

  it('Offerte erstellen, Nummern und Summen', async () => {
    quoteId = await createDocument(db, 'quote', { customer_id: customerId, date: '2026-10-25', due_date: '2026-11-24', title: 'Test', intro: '', footer: '', discount_percent: 10, vat_enabled: true, currency: 'CHF', items }, 'O');
    const q = await getDocument(db, quoteId);
    expect(q?.number).toBe('O-2026-0001');
    expect(q?.items).toHaveLength(2);
    expect(q?.subtotal).toBe(29000);
    expect(q?.discount_amount).toBe(2900);
    expect(q!.total % 5).toBe(0);
    const second = await createDocument(db, 'quote', { customer_id: customerId, date: '2026-10-26', due_date: null, title: '', intro: '', footer: '', discount_percent: 0, vat_enabled: false, currency: 'CHF', items: items.slice(0, 1) }, 'O');
    expect((await getDocument(db, second))?.number).toBe('O-2026-0002');
    await updateDocument(db, second, { customer_id: customerId, date: '2026-10-26', due_date: null, title: 'geändert', intro: '', footer: '', discount_percent: 0, vat_enabled: false, currency: 'CHF', items });
    const upd = await getDocument(db, second);
    expect(upd?.title).toBe('geändert');
    expect(upd?.items).toHaveLength(2);
    expect(upd?.items[1].vat_rate).toBe(0);
  });

  it('Offerte → Rechnung, Zahlungen, Status', async () => {
    await setDocumentStatus(db, quoteId, 'sent');
    const sent = await getDocument(db, quoteId);
    expect(sent?.status).toBe('sent');
    expect(sent?.sent_at).toBeTruthy();
    invoiceId = await convertQuoteToInvoice(db, sent!, 'R', '2026-10-26', '2026-11-25', 'Danke', 'Gruss');
    const inv = await getDocument(db, invoiceId);
    expect(inv?.number).toBe('R-2026-0001');
    expect(inv?.source_number).toBe('O-2026-0001');
    expect((await getDocument(db, quoteId))?.status).toBe('invoiced');
    await setDocumentStatus(db, invoiceId, 'sent');
    await addPayment(db, invoiceId, { date: '2026-10-26', amount: 10000, method: 'bank', note: 'Akonto' });
    let after = await getDocument(db, invoiceId);
    expect(after?.paid).toBe(10000);
    expect(after?.status).toBe('sent');
    await addPayment(db, invoiceId, { date: '2026-10-27', amount: after!.total - 10000, method: 'bank', note: 'Rest' });
    after = await getDocument(db, invoiceId);
    expect(after?.status).toBe('paid');
    expect(after?.paid_at).toBe('2026-10-27');
    const open = await listDocuments(db, 'invoice', { status: 'open' });
    expect(open).toHaveLength(0);
    const all = await listDocuments(db, 'invoice', { q: 'hauswartung' });
    expect(all).toHaveLength(1);
  });

  it('Dashboard-Kennzahlen und Pendenzen', async () => {
    const overdueId = await createDocument(db, 'invoice', { customer_id: customerId, date: '2026-08-01', due_date: '2026-08-31', title: '', intro: '', footer: '', discount_percent: 0, vat_enabled: false, currency: 'CHF', items: items.slice(1) }, 'R');
    await setDocumentStatus(db, overdueId, 'sent');
    await setReminder(db, overdueId, 1, '2026-10-20');
    await createTask(db, { title: 'Nachfassen', details: '', customer_id: customerId, document_id: null, due_date: '2026-10-01' });
    const stats = await getDashboardStats(db, '2026-10-26');
    expect(stats.open_count).toBe(1);
    expect(stats.open_amount).toBe(5000);
    expect(stats.overdue_count).toBe(1);
    expect(stats.overdue_amount).toBe(5000);
    expect(stats.paid_year).toBe((await getDocument(db, invoiceId))!.total);
    expect(stats.open_tasks).toBe(1);
    expect(stats.customer_count).toBe(1);
    const overdueList = await listDocuments(db, 'invoice', { status: 'overdue', today: '2026-10-26' });
    expect(overdueList.map((d) => d.id)).toEqual([overdueId]);
    const todos = await getTodos(db, '2026-10-26');
    expect(todos.map((t) => t.type)).toContain('overdue');
    expect(todos.map((t) => t.type)).toContain('task');
    expect(todos[0].urgency).toBe('high');
  });

  it('Kunde mit Dokumenten wird archiviert statt gelöscht', async () => {
    expect(await deleteOrArchiveCustomer(db, customerId)).toBe('archived');
    const other = await createCustomer(db, { ...customer, company: 'Leer AG' });
    expect(await deleteOrArchiveCustomer(db, other)).toBe('deleted');
  });
});
