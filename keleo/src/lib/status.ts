import type { DocumentKind } from './kinds';

export interface StatusInfo {
  key: string;
  label: string;
  cls: 'grey' | 'blue' | 'green' | 'red' | 'orange' | 'purple';
}

export interface StatusSource {
  kind: DocumentKind;
  status: string;
  due_date: string | null;
  total: number;
  reminder_level: number;
  paid?: number;
}

/** Ermittelt den Anzeigestatus inkl. abgeleiteter Zustände (überfällig, teilbezahlt, abgelaufen). */
export function documentStatus(doc: StatusSource, todayIso: string): StatusInfo {
  const paid = doc.paid ?? 0;
  if (doc.kind === 'invoice') {
    switch (doc.status) {
      case 'draft':
        return { key: 'draft', label: 'Entwurf', cls: 'grey' };
      case 'cancelled':
        return { key: 'cancelled', label: 'Storniert', cls: 'grey' };
      case 'paid':
        return { key: 'paid', label: 'Bezahlt', cls: 'green' };
      case 'sent': {
        const overdue = !!doc.due_date && doc.due_date < todayIso;
        if (paid > 0 && paid < doc.total) {
          return overdue
            ? { key: 'overdue', label: 'Teilbezahlt · überfällig', cls: 'red' }
            : { key: 'partial', label: 'Teilbezahlt', cls: 'orange' };
        }
        if (overdue) {
          const lvl = doc.reminder_level;
          const suffix = lvl === 1 ? ' · Erinnerung' : lvl === 2 ? ' · 1. Mahnung' : lvl >= 3 ? ' · 2. Mahnung' : '';
          return { key: 'overdue', label: 'Überfällig' + suffix, cls: 'red' };
        }
        return { key: 'open', label: 'Offen', cls: 'blue' };
      }
    }
  } else {
    switch (doc.status) {
      case 'draft':
        return { key: 'draft', label: 'Entwurf', cls: 'grey' };
      case 'sent':
        if (doc.due_date && doc.due_date < todayIso) return { key: 'expired', label: 'Abgelaufen', cls: 'orange' };
        return { key: 'open', label: 'Offen', cls: 'blue' };
      case 'accepted':
        return { key: 'accepted', label: 'Angenommen', cls: 'green' };
      case 'declined':
        return { key: 'declined', label: 'Abgelehnt', cls: 'red' };
      case 'invoiced':
        return { key: 'invoiced', label: 'Verrechnet', cls: 'purple' };
    }
  }
  return { key: doc.status, label: doc.status, cls: 'grey' };
}
