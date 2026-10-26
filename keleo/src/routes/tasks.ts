import { Hono } from 'hono';
import { createTask, deleteTask, listCustomers, listTasks, setTaskDone } from '../db';
import type { AppEnv } from '../env';
import { isValidDate, today } from '../lib/dates';
import { int, str, type Body } from '../lib/form';
import { TasksPage } from '../views/tasks';
import { flash, idParam, render, safeBack } from './shared';

export const tasks = new Hono<AppEnv>();

tasks.get('/', async (c) => {
  const showDone = c.req.query('erledigt') === '1';
  const [list, customers] = await Promise.all([listTasks(c.get('db'), { done: showDone }), listCustomers(c.get('db'))]);
  return render(c, 'Aufgaben', 'tasks', TasksPage({ tasks: list, customers, showDone, today: today() }), {
    subtitle: showDone ? 'Erledigte Aufgaben' : `${list.length} offen`,
  });
});

tasks.post('/', async (c) => {
  const body = (await c.req.parseBody()) as Body;
  const title = str(body, 'title');
  const back = safeBack(str(body, 'back'), '/aufgaben');
  if (title === '') {
    flash(c, 'error', 'Bitte einen Titel für die Aufgabe eingeben.');
    return c.redirect(back);
  }
  const due = str(body, 'due_date');
  const customerId = int(body, 'customer_id', 0);
  const documentId = int(body, 'document_id', 0);
  await createTask(c.get('db'), {
    title,
    details: str(body, 'details'),
    customer_id: customerId > 0 ? customerId : null,
    document_id: documentId > 0 ? documentId : null,
    due_date: isValidDate(due) ? due : null,
  });
  flash(c, 'success', 'Aufgabe gespeichert.');
  return c.redirect(back);
});

tasks.post('/:id/erledigt', async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const body = (await c.req.parseBody()) as Body;
  await setTaskDone(c.get('db'), id, str(body, 'done', '1') !== '0');
  return c.redirect(safeBack(str(body, 'back'), '/aufgaben'));
});

tasks.post('/:id/loeschen', async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const body = (await c.req.parseBody()) as Body;
  await deleteTask(c.get('db'), id);
  flash(c, 'success', 'Aufgabe gelöscht.');
  return c.redirect(safeBack(str(body, 'back'), '/aufgaben'));
});
