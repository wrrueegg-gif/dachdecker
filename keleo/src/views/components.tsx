import type { Child, FC } from 'hono/jsx';
import { formatAmount } from '../lib/money';
import type { StatusInfo } from '../lib/status';

export const Badge: FC<{ status: StatusInfo }> = ({ status }) => <span class={`badge badge-${status.cls}`}>{status.label}</span>;

export const Money: FC<{ value: number; currency?: string; strong?: boolean; muted?: boolean }> = ({ value, currency, strong, muted }) => (
  <span class={`money${strong ? ' strong' : ''}${muted ? ' muted' : ''}`}>
    {currency ? `${currency} ` : ''}
    {formatAmount(value)}
  </span>
);

export const Field: FC<{ label: string; hint?: string; class?: string; children?: Child }> = ({ label, hint, class: cls, children }) => (
  <label class={`field ${cls ?? ''}`}>
    <span class="field-label">{label}</span>
    {children}
    {hint ? <span class="hint">{hint}</span> : null}
  </label>
);

interface InputProps {
  label: string;
  name: string;
  value?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  class?: string;
  inputmode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'url' | 'search' | 'none';
  autofocus?: boolean;
  list?: string;
  min?: string;
  max?: string;
  step?: string;
}

export const Input: FC<InputProps> = (p) => (
  <Field label={p.label} hint={p.hint} class={p.class}>
    <input
      type={p.type ?? 'text'}
      name={p.name}
      value={p.value === null || p.value === undefined ? '' : String(p.value)}
      required={p.required}
      placeholder={p.placeholder}
      inputmode={p.inputmode}
      autofocus={p.autofocus}
      list={p.list}
      min={p.min}
      max={p.max}
      step={p.step}
    />
  </Field>
);

export const Textarea: FC<{ label: string; name: string; value?: string | null; rows?: number; hint?: string; class?: string; placeholder?: string }> = (p) => (
  <Field label={p.label} hint={p.hint} class={p.class}>
    <textarea name={p.name} rows={p.rows ?? 3} placeholder={p.placeholder}>
      {p.value ?? ''}
    </textarea>
  </Field>
);

export const Select: FC<{ label: string; name: string; value?: string | number | null; options: { value: string; label: string }[]; hint?: string; class?: string; required?: boolean; empty?: string }> = (p) => (
  <Field label={p.label} hint={p.hint} class={p.class}>
    <select name={p.name} required={p.required}>
      {p.empty !== undefined ? <option value="">{p.empty}</option> : null}
      {p.options.map((o) => (
        <option value={o.value} selected={String(p.value ?? '') === o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </Field>
);

export const Checkbox: FC<{ label: string; name: string; checked?: boolean; hint?: string; id?: string }> = (p) => (
  <label class="field checkbox">
    <input type="checkbox" name={p.name} value="1" checked={p.checked} id={p.id} />
    <span>
      {p.label}
      {p.hint ? <span class="hint">{p.hint}</span> : null}
    </span>
  </label>
);

export const Empty: FC<{ text: string; children?: Child }> = ({ text, children }) => (
  <div class="empty">
    <p>{text}</p>
    {children}
  </div>
);

export const Card: FC<{ title?: string; class?: string; actions?: Child; children?: Child }> = ({ title, class: cls, actions, children }) => (
  <section class={`card ${cls ?? ''}`}>
    {title || actions ? (
      <header class="card-header">
        {title ? <h2>{title}</h2> : <span />}
        {actions ? <div class="card-actions">{actions}</div> : null}
      </header>
    ) : null}
    <div class="card-body">{children}</div>
  </section>
);

/** Kleines Formular mit nur einem Button (für Statuswechsel, Löschen usw.). */
export const ActionForm: FC<{ action: string; label: string; cls?: string; confirm?: string; hidden?: Record<string, string>; children?: Child }> = ({ action, label, cls, confirm, hidden }) => (
  <form method="post" action={action} class="inline" data-confirm={confirm}>
    {hidden
      ? Object.entries(hidden).map(([k, v]) => <input type="hidden" name={k} value={v} />)
      : null}
    <button type="submit" class={`btn ${cls ?? 'btn-secondary'}`}>
      {label}
    </button>
  </form>
);
