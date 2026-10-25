export type DocumentKind = 'quote' | 'invoice';

export interface KindMeta {
  kind: DocumentKind;
  singular: string;
  plural: string;
  path: string;
  dueLabel: string;
  navKey: string;
}

export const KINDS: Record<DocumentKind, KindMeta> = {
  quote: { kind: 'quote', singular: 'Offerte', plural: 'Offerten', path: '/offerten', dueLabel: 'Gültig bis', navKey: 'quotes' },
  invoice: { kind: 'invoice', singular: 'Rechnung', plural: 'Rechnungen', path: '/rechnungen', dueLabel: 'Zahlbar bis', navKey: 'invoices' },
};
