import { Hono } from 'hono';
import { getDashboardStats, getTodos, listDocuments } from '../db';
import type { AppEnv } from '../env';
import { today } from '../lib/dates';
import { DashboardPage } from '../views/dashboard';
import { render } from './shared';

export const dashboard = new Hono<AppEnv>();

dashboard.get('/', async (c) => {
  const db = c.env.DB;
  const t = today();
  const [stats, todos, invoices, quotes] = await Promise.all([
    getDashboardStats(db, t),
    getTodos(db, t),
    listDocuments(db, 'invoice', { limit: 6 }),
    listDocuments(db, 'quote', { limit: 6 }),
  ]);
  const s = c.get('settings');
  const setupNeeded = s.company_name === '' || s.iban === '';
  return render(c, 'Übersicht', 'dashboard', DashboardPage({ stats, todos, invoices, quotes, today: t, setupNeeded }), {
    subtitle: `Stand ${t.split('-').reverse().join('.')}`,
    actions: [
      { href: '/offerten/neu', label: 'Neue Offerte', cls: 'btn-secondary' },
      { href: '/rechnungen/neu', label: 'Neue Rechnung', cls: 'btn-primary' },
    ],
  });
});
