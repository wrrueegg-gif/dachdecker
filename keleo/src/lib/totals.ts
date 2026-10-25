import { roundTo5 } from './money';

export interface ItemInput {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number; // Rappen
  vat_rate: number; // Prozent, z. B. 8.1
}

export interface ItemCalc extends ItemInput {
  amount: number; // Rappen
}

export interface VatLine {
  rate: number;
  base: number;
  amount: number;
}

export interface Totals {
  items: ItemCalc[];
  subtotal: number;
  discount_amount: number;
  vat_lines: VatLine[];
  vat_amount: number;
  rounding: number;
  total: number;
}

/**
 * Berechnet alle Summen eines Dokuments. Preise sind exkl. MwSt.
 * Der Rabatt wird auf die Zwischensumme gewährt, die MwSt pro Satz auf den
 * rabattierten Betrag berechnet, das Total bei CHF auf 5 Rappen gerundet.
 * Dieselbe Logik ist in public/app.js für die Live-Vorschau nachgebaut.
 */
export function computeTotals(items: ItemInput[], discountPercent: number, vatEnabled: boolean, currency = 'CHF'): Totals {
  const calc: ItemCalc[] = items.map((i) => ({ ...i, amount: Math.round(i.quantity * i.unit_price) }));
  const subtotal = calc.reduce((s, i) => s + i.amount, 0);
  const discount_amount = discountPercent > 0 ? Math.round((subtotal * discountPercent) / 100) : 0;
  const factor = subtotal !== 0 ? (subtotal - discount_amount) / subtotal : 1;

  const vat_lines: VatLine[] = [];
  if (vatEnabled) {
    const byRate = new Map<number, number>();
    for (const i of calc) {
      if (i.vat_rate > 0) byRate.set(i.vat_rate, (byRate.get(i.vat_rate) ?? 0) + i.amount);
    }
    for (const [rate, gross] of [...byRate.entries()].sort((a, b) => a[0] - b[0])) {
      const base = Math.round(gross * factor);
      vat_lines.push({ rate, base, amount: Math.round((base * rate) / 100) });
    }
  }
  const vat_amount = vat_lines.reduce((s, v) => s + v.amount, 0);
  const net = subtotal - discount_amount + vat_amount;
  const total = currency === 'CHF' ? roundTo5(net) : net;
  return { items: calc, subtotal, discount_amount, vat_lines, vat_amount, rounding: total - net, total };
}
