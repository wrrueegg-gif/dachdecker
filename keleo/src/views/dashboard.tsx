import type { FC } from 'hono/jsx';
import type { DashboardStats, DocumentRow, Todo } from '../db';
import { formatDate } from '../lib/dates';
import { KINDS } from '../lib/kinds';
import { documentStatus } from '../lib/status';
import { Badge, Card, Empty, Money } from './components';

const urgencyLabel: Record<Todo['urgency'], string> = { high: 'Dringend', medium: 'Bald', low: 'Später' };

export const DashboardPage: FC<{ stats: DashboardStats; todos: Todo[]; invoices: DocumentRow[]; quotes: DocumentRow[]; today: string; setupNeeded: boolean }> = ({ stats, todos, invoices, quotes, today, setupNeeded }) => (
  <>
    {setupNeeded ? (
      <div class="flash flash-info">
        Willkommen! Bitte zuerst unter <a href="/einstellungen">Einstellungen</a> Firmenname, Adresse und IBAN erfassen – diese Angaben erscheinen auf Rechnungen und im QR-Zahlteil.
      </div>
    ) : null}
    <div class="kpis">
      <a class="kpi" href="/rechnungen?status=open">
        <span class="kpi-label">Offene Rechnungen</span>
        <span class="kpi-value"><Money value={stats.open_amount} currency="CHF" /></span>
        <span class="kpi-sub">{stats.open_count} Rechnung{stats.open_count === 1 ? '' : 'en'}</span>
      </a>
      <a class={`kpi ${stats.overdue_count > 0 ? 'kpi-alert' : ''}`} href="/rechnungen?status=overdue">
        <span class="kpi-label">Überfällig</span>
        <span class="kpi-value"><Money value={stats.overdue_amount} currency="CHF" /></span>
        <span class="kpi-sub">{stats.overdue_count} Rechnung{stats.overdue_count === 1 ? '' : 'en'}</span>
      </a>
      <a class="kpi" href="/offerten?status=sent">
        <span class="kpi-label">Offene Offerten</span>
        <span class="kpi-value"><Money value={stats.quotes_amount} currency="CHF" /></span>
        <span class="kpi-sub">{stats.quotes_count} Offerte{stats.quotes_count === 1 ? '' : 'n'}</span>
      </a>
      <a class="kpi" href="/rechnungen?status=paid">
        <span class="kpi-label">Eingenommen {today.slice(0, 4)}</span>
        <span class="kpi-value"><Money value={stats.paid_year} currency="CHF" /></span>
        <span class="kpi-sub">Verrechnet: <Money value={stats.invoiced_year} /></span>
      </a>
    </div>

    <div class="grid-2">
      <Card title={`Zu erledigen (${todos.length})`} actions={<a class="btn btn-sm btn-secondary" href="/aufgaben">Alle Aufgaben</a>}>
        {todos.length === 0 ? (
          <Empty text="Nichts offen – alles erledigt." />
        ) : (
          <ul class="todo-list">
            {todos.slice(0, 12).map((t) => (
              <li class={`todo todo-${t.urgency}`}>
                <a href={t.href} class="todo-main">
                  <span class="todo-label">{t.label}</span>
                  <span class="todo-detail muted">{t.detail}</span>
                </a>
                <span class="todo-meta">
                  {t.amount !== null ? <Money value={t.amount} /> : null}
                  {t.due ? <span class="muted small">{formatDate(t.due)}</span> : null}
                  <span class={`pill pill-${t.urgency}`}>{urgencyLabel[t.urgency]}</span>
                </span>
              </li>
            ))}
            {todos.length > 12 ? <li class="muted small">… und {todos.length - 12} weitere</li> : null}
          </ul>
        )}
      </Card>

      <div class="stack">
        <Card title="Letzte Rechnungen" actions={<a class="btn btn-sm btn-secondary" href="/rechnungen">Alle</a>}>
          {invoices.length === 0 ? (
            <Empty text="Noch keine Rechnungen.">
              <a class="btn btn-primary btn-sm" href="/rechnungen/neu">Erste Rechnung erstellen</a>
            </Empty>
          ) : (
            <table class="table compact">
              <tbody>
                {invoices.map((d) => (
                  <tr>
                    <td><a href={`${KINDS.invoice.path}/${d.id}`}>{d.number}</a></td>
                    <td>{d.customer_name}</td>
                    <td class="muted">{formatDate(d.date)}</td>
                    <td class="num"><Money value={d.total} /></td>
                    <td><Badge status={documentStatus(d, today)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Letzte Offerten" actions={<a class="btn btn-sm btn-secondary" href="/offerten">Alle</a>}>
          {quotes.length === 0 ? (
            <Empty text="Noch keine Offerten.">
              <a class="btn btn-primary btn-sm" href="/offerten/neu">Erste Offerte erstellen</a>
            </Empty>
          ) : (
            <table class="table compact">
              <tbody>
                {quotes.map((d) => (
                  <tr>
                    <td><a href={`${KINDS.quote.path}/${d.id}`}>{d.number}</a></td>
                    <td>{d.customer_name}</td>
                    <td class="muted">{formatDate(d.date)}</td>
                    <td class="num"><Money value={d.total} /></td>
                    <td><Badge status={documentStatus(d, today)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  </>
);
