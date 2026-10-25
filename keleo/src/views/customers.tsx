import type { FC } from 'hono/jsx';
import { customerName, type Customer, type CustomerNote, type CustomerRow, type DocumentRow, type Task } from '../db';
import { formatDate, formatDateTime } from '../lib/dates';
import { KINDS } from '../lib/kinds';
import { documentStatus } from '../lib/status';
import { ActionForm, Badge, Card, Empty, Input, Money, Select, Textarea } from './components';

export const CustomerList: FC<{ customers: CustomerRow[]; q: string; archived: boolean }> = ({ customers, q, archived }) => (
  <>
    <form method="get" class="toolbar">
      <input type="search" name="q" value={q} placeholder="Suchen nach Name, Ort, Nummer, E-Mail …" />
      {archived ? <input type="hidden" name="archiv" value="1" /> : null}
      <button class="btn btn-secondary" type="submit">Suchen</button>
      <a class={`btn btn-ghost ${archived ? 'active' : ''}`} href={archived ? '/kunden' : '/kunden?archiv=1'}>
        {archived ? 'Archiv ausblenden' : 'Archiv anzeigen'}
      </a>
    </form>
    {customers.length === 0 ? (
      <Empty text={q ? 'Keine Kunden gefunden.' : 'Noch keine Kunden erfasst.'}>
        <a class="btn btn-primary" href="/kunden/neu">Ersten Kunden erfassen</a>
      </Empty>
    ) : (
      <table class="table">
        <thead>
          <tr>
            <th>Nr.</th>
            <th>Name</th>
            <th>Ort</th>
            <th>Kontakt</th>
            <th class="num">Dokumente</th>
            <th class="num">Offen</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr class={c.archived ? 'muted' : ''}>
              <td class="mono">{c.number}</td>
              <td>
                <a href={`/kunden/${c.id}`}>{customerName(c) || '(ohne Name)'}</a>
                {c.company && (c.first_name || c.last_name) ? <div class="small muted">{`${c.first_name} ${c.last_name}`.trim()}</div> : null}
                {c.archived ? <span class="badge badge-grey">Archiviert</span> : null}
              </td>
              <td>{`${c.zip} ${c.city}`.trim()}</td>
              <td class="small">
                {c.email ? <div><a href={`mailto:${c.email}`}>{c.email}</a></div> : null}
                {c.phone ? <div>{c.phone}</div> : null}
              </td>
              <td class="num">{c.document_count}</td>
              <td class="num">{c.open_amount > 0 ? <Money value={c.open_amount} /> : <span class="muted">–</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </>
);

export const CustomerForm: FC<{ customer?: Partial<Customer> | null; action: string }> = ({ customer, action }) => {
  const c = customer;
  return (
    <form method="post" action={action} class="form">
      <Card title="Art">
        <div class="form-grid">
          <Select
            label="Kundenart"
            name="type"
            value={c?.type ?? 'company'}
            options={[
              { value: 'company', label: 'Firma' },
              { value: 'private', label: 'Privatperson' },
            ]}
          />
        </div>
      </Card>
      <Card title="Name">
        <div class="form-grid">
          <Input label="Firma" name="company" value={c?.company} class="span-2" hint="Bei Privatpersonen leer lassen" />
          <Select
            label="Anrede"
            name="salutation"
            value={c?.salutation ?? ''}
            options={[
              { value: '', label: '–' },
              { value: 'Herr', label: 'Herr' },
              { value: 'Frau', label: 'Frau' },
            ]}
          />
          <Input label="Vorname" name="first_name" value={c?.first_name} />
          <Input label="Nachname" name="last_name" value={c?.last_name} />
        </div>
      </Card>
      <Card title="Adresse">
        <p class="hint">Strasse und Hausnummer bitte getrennt erfassen – die QR-Rechnung verlangt seit November 2025 strukturierte Adressen.</p>
        <div class="form-grid">
          <Input label="Strasse" name="street" value={c?.street} class="span-2" />
          <Input label="Nr." name="house_no" value={c?.house_no} />
          <Input label="PLZ" name="zip" value={c?.zip} />
          <Input label="Ort" name="city" value={c?.city} class="span-2" />
          <Input label="Land" name="country" value={c?.country ?? 'CH'} hint="Ländercode, z. B. CH, DE, AT" />
        </div>
      </Card>
      <Card title="Kontakt">
        <div class="form-grid">
          <Input label="E-Mail" name="email" type="email" value={c?.email} class="span-2" hint="Für den Versand von Offerten und Rechnungen" />
          <Input label="Telefon" name="phone" value={c?.phone} />
        </div>
      </Card>
      <Card title="Eigene Angaben">
        <Textarea label="Bemerkungen" name="remarks" value={c?.remarks} rows={4} hint="Freier Text, der nur intern sichtbar ist: Vereinbarungen, Zugangscodes, Vorlieben, Besonderheiten …" />
      </Card>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit">{c?.id ? 'Speichern' : 'Kunde anlegen'}</button>
        <a class="btn btn-ghost" href={c?.id ? `/kunden/${c.id}` : '/kunden'}>Abbrechen</a>
      </div>
    </form>
  );
};

export const CustomerDetail: FC<{ customer: Customer; documents: DocumentRow[]; notes: CustomerNote[]; tasks: Task[]; today: string }> = ({ customer: c, documents, notes, tasks, today }) => {
  const openTasks = tasks.filter((t) => t.done === 0);
  const doneTasks = tasks.filter((t) => t.done === 1);
  const open = documents.filter((d) => d.kind === 'invoice' && d.status === 'sent').reduce((s, d) => s + d.total - d.paid, 0);
  return (
    <div class="grid-2 grid-sidebar">
      <div class="stack">
        <Card title="Dokumente" actions={<>
          <a class="btn btn-sm btn-secondary" href={`/offerten/neu?kunde=${c.id}`}>Neue Offerte</a>
          <a class="btn btn-sm btn-primary" href={`/rechnungen/neu?kunde=${c.id}`}>Neue Rechnung</a>
        </>}>
          {documents.length === 0 ? (
            <Empty text="Noch keine Offerten oder Rechnungen für diesen Kunden." />
          ) : (
            <table class="table compact">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Art</th>
                  <th>Datum</th>
                  <th class="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr>
                    <td><a href={`${KINDS[d.kind].path}/${d.id}`}>{d.number}</a></td>
                    <td>{KINDS[d.kind].singular}</td>
                    <td class="muted">{formatDate(d.date)}</td>
                    <td class="num"><Money value={d.total} /></td>
                    <td><Badge status={documentStatus(d, today)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Notizen" >
          <form method="post" action={`/kunden/${c.id}/notizen`} class="stack">
            <textarea name="body" rows={3} required placeholder="Was ist besprochen worden? Was darf nicht vergessen gehen?"></textarea>
            <div><button class="btn btn-secondary btn-sm" type="submit">Notiz speichern</button></div>
          </form>
          {notes.length === 0 ? (
            <p class="muted small">Noch keine Notizen.</p>
          ) : (
            <ul class="notes">
              {notes.map((n) => (
                <li class="note">
                  <div class="note-meta muted small">
                    {formatDateTime(n.created_at)}
                    <ActionForm action={`/notizen/${n.id}/loeschen`} label="Löschen" cls="btn-link btn-sm" confirm="Notiz wirklich löschen?" />
                  </div>
                  <div class="note-body">{n.body}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Aufgaben zu diesem Kunden">
          <form method="post" action="/aufgaben" class="inline-form">
            <input type="hidden" name="customer_id" value={String(c.id)} />
            <input type="hidden" name="back" value={`/kunden/${c.id}`} />
            <input type="text" name="title" placeholder="Neue Aufgabe, z. B. Rückruf wegen Offerte" required />
            <input type="date" name="due_date" />
            <button class="btn btn-secondary btn-sm" type="submit">Hinzufügen</button>
          </form>
          {openTasks.length === 0 && doneTasks.length === 0 ? <p class="muted small">Keine Aufgaben.</p> : null}
          <ul class="task-list">
            {openTasks.map((t) => (
              <li class={`task ${t.due_date && t.due_date < today ? 'task-late' : ''}`}>
                <ActionForm action={`/aufgaben/${t.id}/erledigt`} label="✓" cls="btn-check" hidden={{ back: `/kunden/${c.id}`, done: '1' }} />
                <span class="task-title">{t.title}</span>
                {t.due_date ? <span class="muted small">bis {formatDate(t.due_date)}</span> : null}
              </li>
            ))}
            {doneTasks.slice(0, 5).map((t) => (
              <li class="task task-done">
                <ActionForm action={`/aufgaben/${t.id}/erledigt`} label="↺" cls="btn-check" hidden={{ back: `/kunden/${c.id}`, done: '0' }} />
                <span class="task-title">{t.title}</span>
                <span class="muted small">erledigt {formatDate(t.done_at?.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div class="stack">
        <Card title="Kontakt" actions={<a class="btn btn-sm btn-secondary" href={`/kunden/${c.id}/bearbeiten`}>Bearbeiten</a>}>
          <dl class="dl">
            <dt>Kunden-Nr.</dt>
            <dd class="mono">{c.number}</dd>
            <dt>Art</dt>
            <dd>{c.type === 'company' ? 'Firma' : 'Privatperson'}</dd>
            <dt>Adresse</dt>
            <dd>
              {c.company ? <div>{c.company}</div> : null}
              {(c.first_name || c.last_name) ? <div>{`${c.salutation} ${c.first_name} ${c.last_name}`.trim()}</div> : null}
              <div>{`${c.street} ${c.house_no}`.trim()}</div>
              <div>{`${c.zip} ${c.city}`.trim()}</div>
              {c.country && c.country !== 'CH' ? <div>{c.country}</div> : null}
            </dd>
            <dt>E-Mail</dt>
            <dd>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <span class="muted">–</span>}</dd>
            <dt>Telefon</dt>
            <dd>{c.phone || <span class="muted">–</span>}</dd>
            <dt>Offen</dt>
            <dd>{open > 0 ? <Money value={open} currency="CHF" strong /> : <span class="muted">nichts offen</span>}</dd>
          </dl>
          {!c.street || !c.zip || !c.city ? <p class="hint warn">Adresse unvollständig – der Zahlungspflichtige kann im QR-Zahlteil nicht vorbelegt werden.</p> : null}
        </Card>
        <Card title="Eigene Angaben" actions={<a class="btn btn-sm btn-ghost" href={`/kunden/${c.id}/bearbeiten`}>Ändern</a>}>
          {c.remarks ? <div class="prose">{c.remarks}</div> : <p class="muted small">Keine Bemerkungen. Hier ist Platz für alles, was man zu diesem Kunden wissen muss.</p>}
        </Card>
        <Card title="Verwaltung">
          <div class="stack-sm">
            {c.archived ? (
              <ActionForm action={`/kunden/${c.id}/reaktivieren`} label="Kunde reaktivieren" cls="btn-secondary" />
            ) : (
              <ActionForm action={`/kunden/${c.id}/loeschen`} label="Kunde löschen / archivieren" cls="btn-danger" confirm="Kunde wirklich löschen? Kunden mit Dokumenten werden stattdessen archiviert." />
            )}
            <p class="muted small">Erfasst am {formatDateTime(c.created_at)}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
