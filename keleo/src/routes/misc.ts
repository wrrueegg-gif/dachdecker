import { Hono } from 'hono';
import { deleteNote, deletePayment } from '../db';
import type { AppEnv } from '../env';
import { flash, idParam } from './shared';

export const misc = new Hono<AppEnv>();

misc.post('/notizen/:id/loeschen', async (c) => {
  const id = idParam(c);
  const customerId = id ? await deleteNote(c.get('db'), id) : null;
  if (customerId === null) return c.notFound();
  flash(c, 'success', 'Notiz gelöscht.');
  return c.redirect(`/kunden/${customerId}`);
});

misc.post('/zahlungen/:id/loeschen', async (c) => {
  const id = idParam(c);
  const docId = id ? await deletePayment(c.get('db'), id) : null;
  if (docId === null) return c.notFound();
  flash(c, 'success', 'Zahlung gelöscht.');
  return c.redirect(`/rechnungen/${docId}`);
});
