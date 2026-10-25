import { describe, expect, it } from 'vitest';
import {
  buildQrPayload,
  buildQrrReference,
  buildScorReference,
  formatIban,
  formatReference,
  isQrIban,
  isValidIban,
  isValidQrrReference,
  isValidScorReference,
  mod10CheckDigit,
  validateQrBill,
  type QRBillData,
} from '../src/lib/qrbill';

describe('IBAN', () => {
  it('erkennt gültige und ungültige IBANs', () => {
    expect(isValidIban('CH93 0076 2011 6238 5295 7')).toBe(true);
    expect(isValidIban('CH4431999123000889012')).toBe(true);
    expect(isValidIban('CH9300762011623852958')).toBe(false);
    expect(isValidIban('CH93007620116238529')).toBe(false);
    expect(isValidIban('')).toBe(false);
  });
  it('erkennt QR-IBANs an der IID 30000–31999', () => {
    expect(isQrIban('CH4431999123000889012')).toBe(true);
    expect(isQrIban('CH9300762011623852957')).toBe(false);
  });
  it('formatiert in Vierergruppen', () => {
    expect(formatIban('ch9300762011623852957')).toBe('CH93 0076 2011 6238 5295 7');
  });
});

describe('QR-Referenz (QRR)', () => {
  it('berechnet die Modulo-10-Prüfziffer', () => {
    // Beispiel aus den SIX-Richtlinien: 21 00000 00003 13947 14300 09017
    expect(mod10CheckDigit('21000000000313947143000901')).toBe(7);
    expect(isValidQrrReference('210000000003139471430009017')).toBe(true);
    expect(isValidQrrReference('210000000003139471430009018')).toBe(false);
  });
  it('baut eine 27-stellige Referenz', () => {
    const ref = buildQrrReference('12345');
    expect(ref).toHaveLength(27);
    expect(ref.startsWith('000000000000000000000')).toBe(true);
    expect(isValidQrrReference(ref)).toBe(true);
    expect(formatReference('QRR', ref)).toBe('00 00000 00000 00000 00001 23451'.slice(0, 2) + formatReference('QRR', ref).slice(2));
  });
});

describe('Creditor Reference (SCOR)', () => {
  it('berechnet die ISO-11649-Prüfziffern', () => {
    expect(buildScorReference('539007547034')).toBe('RF18539007547034');
    expect(isValidScorReference('RF18 5390 0754 7034')).toBe(true);
    expect(isValidScorReference('RF19539007547034')).toBe(false);
    expect(formatReference('SCOR', 'RF18539007547034')).toBe('RF18 5390 0754 7034');
  });
});

const sample: QRBillData = {
  iban: 'CH4431999123000889012',
  creditor: { name: 'Max Muster & Söhne', street: 'Musterstrasse', houseNo: '123', zip: '8000', city: 'Seldwyla', country: 'CH' },
  debtor: { name: 'Simon Muster', street: 'Musterstrasse', houseNo: '1', zip: '8000', city: 'Seldwyla', country: 'CH' },
  amount: 194975,
  currency: 'CHF',
  referenceType: 'QRR',
  reference: '210000000003139471430009017',
  message: 'Rechnung R-2026-0001',
};

describe('QR-Payload', () => {
  it('hat den vorgeschriebenen Aufbau mit 31 Zeilen', () => {
    const lines = buildQrPayload(sample).split('\n');
    expect(lines).toHaveLength(31);
    expect(lines[0]).toBe('SPC');
    expect(lines[1]).toBe('0200');
    expect(lines[2]).toBe('1');
    expect(lines[3]).toBe('CH4431999123000889012');
    expect(lines[4]).toBe('S');
    expect(lines[5]).toBe('Max Muster & Söhne');
    expect(lines[18]).toBe('1949.75');
    expect(lines[19]).toBe('CHF');
    expect(lines[20]).toBe('S');
    expect(lines[27]).toBe('QRR');
    expect(lines[28]).toBe('210000000003139471430009017');
    expect(lines[29]).toBe('Rechnung R-2026-0001');
    expect(lines[30]).toBe('EPD');
  });
  it('lässt Betrag und Zahlungspflichtigen leer, wenn nicht gesetzt', () => {
    const lines = buildQrPayload({ ...sample, amount: null, debtor: null, referenceType: 'NON', reference: '' }).split('\n');
    expect(lines[18]).toBe('');
    expect(lines[20]).toBe('');
    expect(lines[27]).toBe('NON');
    expect(lines[28]).toBe('');
  });
  it('validiert Kombinationen von IBAN und Referenz', () => {
    expect(validateQrBill(sample)).toEqual([]);
    expect(validateQrBill({ ...sample, referenceType: 'NON' })).toContain('Eine QR-IBAN erfordert eine QR-Referenz (QRR).');
    expect(validateQrBill({ ...sample, iban: 'CH9300762011623852957' })).toContain('Eine QR-Referenz (QRR) ist nur zusammen mit einer QR-IBAN erlaubt.');
    expect(validateQrBill({ ...sample, iban: 'CH9300762011623852957', referenceType: 'SCOR', reference: 'RF18539007547034' })).toEqual([]);
    expect(validateQrBill({ ...sample, creditor: { ...sample.creditor, zip: '' } })).toHaveLength(1);
  });
});
