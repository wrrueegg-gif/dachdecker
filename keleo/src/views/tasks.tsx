import type { FC } from 'hono/jsx';
import { customerName, type Customer, type Task } from '../db';
import { formatDate } from '../lib/dates';
import { KINDS } from '../lib/kinds';
import { ActionForm, Card, Empty } from './components';

export const TasksPage: FC<{ tasks: Task[]; customers: Customer[]; showDone: boolean; today: string }> = ({ tasks, customers, showDone, today }) => (
  <div class="grid-2 grid-sidebar">
    <Card title={showDone ? 'Erledigte Aufgaben' : 'Offene Aufgaben'} actions={<a class="btn btn-sm btn-ghost" href={showDone ? '/aufgaben' : '/aufgaben?erledigt=1'}>{showDone ? 'Offene anzeigen' : 'Erledigte anzeigen'}</a>}>
      {tasks.length === 0 ? <Empty text={showDone ? 'Noch nichts erledigt.' : 'Keine offenen Aufgaben.'} /> : (
        <ul class="task-list">
          {tasks.map((t) => (
            <li class={`task ${t.done ? 'task-done' : t.due_date && t.due_date < today ? 'task-late' : ''}`}>
              <ActionForm action={`/aufgaben/${t.id}/erledigt`} label={t.done ? '↺' : '✓'} cls="btn-check" hidden={{ done: t.done ? '0' : '1', back: showDone ? '/aufgaben?erledigt=1' : '/aufgaben' }} />
              <div class="task-main">
                <span class="task-title">{t.title}</span>
                {t.details ? <div class="muted small pre">{t.details}</div> : null}
                <div class="small muted">
                  {t.customer_name ? <a href={`/kunden/${t.customer_id}`}>{t.customer_name}</a> : null}
                  {t.document_number && t.document_kind ? <> · <a href={`${KINDS[t.document_kind].path}/${t.document_id}`}>{t.document_number}</a></> : null}
                </div>
              </div>
              <div class="task-side">
                {t.due_date ? <span class={`small ${!t.done && t.due_date < today ? 'text-red' : 'muted'}`}>bis {formatDate(t.due_date)}</span> : null}
                <ActionForm action={`/aufgaben/${t.id}/loeschen`} label="Löschen" cls="btn-link btn-sm" confirm="Aufgabe löschen?" hidden={{ back: showDone ? '/aufgaben?erledigt=1' : '/aufgaben' }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
    <Card title="Neue Aufgabe">
      <form method="post" action="/aufgaben" class="stack">
        <input type="hidden" name="back" value="/aufgaben" />
        <label class="field"><span class="field-label">Titel</span><input type="text" name="title" required placeholder="z. B. Offerte nachfassen" /></label>
        <label class="field"><span class="field-label">Details</span><textarea name="details" rows={3}></textarea></label>
        <label class="field"><span class="field-label">Kunde (optional)</span>
          <select name="customer_id">
            <option value="">–</option>
            {customers.map((c) => <option value={String(c.id)}>{customerName(c)}</option>)}
          </select>
        </label>
        <label class="field"><span class="field-label">Fällig am</span><input type="date" name="due_date" /></label>
        <div><button class="btn btn-primary" type="submit">Aufgabe speichern</button></div>
      </form>
    </Card>
  </div>
);
