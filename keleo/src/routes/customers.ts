import { Hono } from 'hono';
import {
  addNote, createCustomer, customerName, deleteOrArchiveCustomer, getCustomer, listCustomers, listDocuments, listNotes, listTasks,
  setCustomerArchived, updateCustomer, type CustomerInput,
} from '../db';
import type { AppEnv } from '../env';
import { today } from '../lib/dates';
import { str, type Body } from '../lib/form';
import { CustomerDetail, CustomerForm, CustomerList } from '../views/customers';
import { flash, idParam, render } from './shared';

export const customers = new Hono<AppEnv>();

function parseCustomer(b: Body): { input: CustomerInput; errors: string[] } {
  const input: CustomerInput = {
    type: str(b, 'type') === 'private' ? 'private' : 'company',
    company: str(b, 'company'),
    salutation: str(b, 'salutation'),
    first_name: str(b, 'first_name'),
    last_name: str(b, 'last_name'),
    street: str(b, 'street'),
    house_no: str(b, 'house_no'),
    zip: str(b, 'zip'),
    city: str(b, 'city'),
    country: (str(b, 'country') || 'CH').toUpperCase().slice(0, 2),
    email: str(b, 'email'),
    phone: str(b, 'phone'),
    remarks: str(b, 'remarks'),
  };
  const errors: string[] = [];
  if (input.company === '' && input.first_name === '' && input.last_name === '') errors.push('Bitte Firma oder Vor-/Nachname erfassen.');
  if (input.email !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) errors.push('Die E-Mail-Adresse ist ungültig.');
  return { input, errors };
}

customers.get('/', async (c) => {
  const q = c.req.query('q') ?? '';
  const archived = c.req.query('archiv') === '1';
  const rows = await listCustomers(c.get('db'), q, archived);
  return render(c, 'Kunden', 'customers', CustomerList({ customers: rows, q, archived }), {
    subtitle: `${rows.length} Kunde${rows.length === 1 ? '' : 'n'}`,
    actions: [{ href: '/kunden/neu', label: 'Neuer Kunde', cls: 'btn-primary' }],
  });
});

customers.get('/neu', (c) => render(c, 'Neuer Kunde', 'customers', CustomerForm({ action: '/kunden' })));

customers.post('/', async (c) => {
  const body = (await c.req.parseBody({ all: true })) as Body;
  const { input, errors } = parseCustomer(body);
  if (errors.length) {
    flash(c, 'error', errors.join(' '));
    return render(c, 'Neuer Kunde', 'customers', CustomerForm({ action: '/kunden', customer: input }));
  }
  const id = await createCustomer(c.get('db'), input);
  flash(c, 'success', `Kunde «${customerName(input)}» wurde angelegt.`);
  return c.redirect(`/kunden/${id}`);
});

customers.get('/:id', async (c) => {
  const id = idParam(c);
  const customer = id ? await getCustomer(c.get('db'), id) : null;
  if (!customer) return c.notFound();
  const db = c.get('db');
  const [quotes, invoices, notes, tasks] = await Promise.all([
    listDocuments(db, 'quote', { customerId: customer.id }),
    listDocuments(db, 'invoice', { customerId: customer.id }),
    listNotes(db, customer.id),
    listTasks(db, { customerId: customer.id }),
  ]);
  const documents = [...quotes, ...invoices].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  return render(c, customerName(customer) || 'Kunde', 'customers', CustomerDetail({ customer, documents, notes, tasks, today: today() }), {
    subtitle: `Kunde ${customer.number}${customer.archived ? ' · archiviert' : ''}`,
    actions: [
      { href: `/kunden/${customer.id}/bearbeiten`, label: 'Bearbeiten', cls: 'btn-secondary' },
      { href: `/rechnungen/neu?kunde=${customer.id}`, label: 'Neue Rechnung', cls: 'btn-primary' },
    ],
  });
});

customers.get('/:id/bearbeiten', async (c) => {
  const id = idParam(c);
  const customer = id ? await getCustomer(c.get('db'), id) : null;
  if (!customer) return c.notFound();
  return render(c, `${customerName(customer)} bearbeiten`, 'customers', CustomerForm({ customer, action: `/kunden/${customer.id}` }));
});

customers.post('/:id', async (c) => {
  const id = idParam(c);
  const customer = id ? await getCustomer(c.get('db'), id) : null;
  if (!customer) return c.notFound();
  const body = (await c.req.parseBody({ all: true })) as Body;
  const { input, errors } = parseCustomer(body);
  if (errors.length) {
    flash(c, 'error', errors.join(' '));
    return render(c, `${customerName(customer)} bearbeiten`, 'customers', CustomerForm({ customer: { ...customer, ...input }, action: `/kunden/${customer.id}` }));
  }
  await updateCustomer(c.get('db'), customer.id, input);
  flash(c, 'success', 'Kunde gespeichert.');
  return c.redirect(`/kunden/${customer.id}`);
});

customers.post('/:id/loeschen', async (c) => {
  const id = idParam(c);
  const customer = id ? await getCustomer(c.get('db'), id) : null;
  if (!customer) return c.notFound();
  const result = await deleteOrArchiveCustomer(c.get('db'), customer.id);
  if (result === 'deleted') {
    flash(c, 'success', `Kunde «${customerName(customer)}» wurde gelöscht.`);
    return c.redirect('/kunden');
  }
  flash(c, 'info', 'Der Kunde hat Dokumente und wurde deshalb archiviert statt gelöscht.');
  return c.redirect(`/kunden/${customer.id}`);
});

customers.post('/:id/reaktivieren', async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  await setCustomerArchived(c.get('db'), id, false);
  flash(c, 'success', 'Kunde wurde reaktiviert.');
  return c.redirect(`/kunden/${id}`);
});

customers.post('/:id/notizen', async (c) => {
  const id = idParam(c);
  const customer = id ? await getCustomer(c.get('db'), id) : null;
  if (!customer) return c.notFound();
  const body = (await c.req.parseBody()) as Body;
  const text = str(body, 'body');
  if (text === '') flash(c, 'error', 'Die Notiz war leer.');
  else {
    await addNote(c.get('db'), customer.id, text);
    flash(c, 'success', 'Notiz gespeichert.');
  }
  return c.redirect(`/kunden/${customer.id}`);
});
