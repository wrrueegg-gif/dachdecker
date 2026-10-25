import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount, roundTo5 } from '../src/lib/money';
import { computeTotals } from '../src/lib/totals';

describe('Beträge', () => {
  it('liest verschiedene Schreibweisen', () => {
    expect(parseAmount("1'234.50")).toBe(123450);
    expect(parseAmount('1234,5')).toBe(123450);
    expect(parseAmount('12')).toBe(1200);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
  });
  it('formatiert mit Tausendertrennzeichen', () => {
    expect(formatAmount(123450)).toBe("1'234.50");
    expect(formatAmount(5)).toBe('0.05');
    expect(formatAmount(-199999)).toBe("-1'999.99");
  });
  it('rundet auf 5 Rappen', () => {
    expect(roundTo5(1232)).toBe(1230);
    expect(roundTo5(1233)).toBe(1235);
    expect(roundTo5(1238)).toBe(1240);
  });
});

describe('Dokumentsummen', () => {
  const items = [
    { description: 'Arbeit', quantity: 2.5, unit: 'h', unit_price: 12000, vat_rate: 8.1 },
    { description: 'Material', quantity: 1, unit: 'Stk', unit_price: 9990, vat_rate: 8.1 },
    { description: 'Buch', quantity: 1, unit: 'Stk', unit_price: 2000, vat_rate: 2.6 },
  ];
  it('ohne MwSt', () => {
    const t = computeTotals(items, 0, false);
    expect(t.subtotal).toBe(30000 + 9990 + 2000);
    expect(t.vat_amount).toBe(0);
    expect(t.total).toBe(41990);
    expect(t.rounding).toBe(0);
  });
  it('mit MwSt, Rabatt und Rappenrundung', () => {
    const t = computeTotals(items, 10, true);
    expect(t.subtotal).toBe(41990);
    expect(t.discount_amount).toBe(4199);
    expect(t.vat_lines.map((v) => v.rate)).toEqual([2.6, 8.1]);
    // 2.6 % auf 1800, 8.1 % auf 35991
    expect(t.vat_lines[0].amount).toBe(47);
    expect(t.vat_lines[1].amount).toBe(2915);
    const net = 41990 - 4199 + 47 + 2915; // 40753
    expect(t.total).toBe(roundTo5(net));
    expect(t.total % 5).toBe(0);
    expect(t.rounding).toBe(t.total - net);
  });
});
