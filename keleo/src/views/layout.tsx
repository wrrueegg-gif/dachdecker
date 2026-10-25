import type { Child, FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Flash } from '../env';

const ICONS: Record<string, string> = {
  dashboard: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  customers: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  quotes: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  invoices: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  tasks: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};

export const Icon: FC<{ name: string }> = ({ name }) => (
  <span class="icon">{raw(`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ''}</svg>`)}</span>
);

const NAV = [
  { key: 'dashboard', href: '/', label: 'Übersicht' },
  { key: 'customers', href: '/kunden', label: 'Kunden' },
  { key: 'quotes', href: '/offerten', label: 'Offerten' },
  { key: 'invoices', href: '/rechnungen', label: 'Rechnungen' },
  { key: 'tasks', href: '/aufgaben', label: 'Aufgaben' },
  { key: 'settings', href: '/einstellungen', label: 'Einstellungen' },
];

export interface LayoutProps {
  title: string;
  active: string;
  appName: string;
  companyName?: string;
  flash?: Flash | null;
  actions?: Child;
  subtitle?: string;
  children?: Child;
}

export const Layout: FC<LayoutProps> = ({ title, active, appName, companyName, flash, actions, subtitle, children }) => (
  <>
    {raw('<!doctype html>')}
    <html lang="de-CH">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · ${appName}`}</title>
        <link rel="stylesheet" href="/app.css" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <div class="shell">
          <aside class="sidebar">
            <a class="brand" href="/">
              <span class="brand-mark">K</span>
              <span>{appName}</span>
            </a>
            <nav class="nav">
              {NAV.map((n) => (
                <a href={n.href} class={active === n.key ? 'active' : ''}>
                  <Icon name={n.key} />
                  <span>{n.label}</span>
                </a>
              ))}
            </nav>
            <div class="sidebar-footer">
              {companyName ? <div class="muted small">{companyName}</div> : null}
              <form method="post" action="/logout">
                <button class="btn btn-ghost btn-sm" type="submit">Abmelden</button>
              </form>
            </div>
          </aside>
          <main class="main">
            <header class="page-header">
              <div>
                <h1>{title}</h1>
                {subtitle ? <p class="muted">{subtitle}</p> : null}
              </div>
              {actions ? <div class="actions">{actions}</div> : null}
            </header>
            {flash ? <div class={`flash flash-${flash.type}`}>{flash.text}</div> : null}
            <div class="content">{children}</div>
          </main>
        </div>
        <script src="/app.js" defer></script>
      </body>
    </html>
  </>
);

export const Plain: FC<{ title: string; appName: string; children?: Child }> = ({ title, appName, children }) => (
  <>
    {raw('<!doctype html>')}
    <html lang="de-CH">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · ${appName}`}</title>
        <link rel="stylesheet" href="/app.css" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body class="plain">{children}</body>
    </html>
  </>
);
