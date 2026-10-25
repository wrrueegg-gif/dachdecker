/**
 * Schweizer QR-Rechnung (Swiss QR-bill) nach den Implementation Guidelines
 * von SIX (Version 2.3, gültig seit 21. November 2025: nur noch strukturierte
 * Adressen vom Typ "S"). Erzeugt den Inhalt des Swiss QR Codes und prüft
 * IBAN, QR-IBAN sowie QR-Referenz (QRR) und Creditor Reference (SCOR).
 */

export type ReferenceType = 'QRR' | 'SCOR' | 'NON';

export interface QRAddress {
  name: string;
  street: string;
  houseNo: string;
  zip: string;
  city: string;
  country: string;
}

export interface QRBillData {
  iban: string;
  creditor: QRAddress;
  debtor: QRAddress | null;
  /** Betrag in Rappen; null = offener Betrag (leeres Feld) */
  amount: number | null;
  currency: 'CHF' | 'EUR';
  referenceType: ReferenceType;
  reference: string;
  /** Unstrukturierte Mitteilung, max. 140 Zeichen */
  message: string;
}

export function normalizeIban(iban: string): string {
  return (iban || '').replace(/\s+/g, '').toUpperCase();
}

function toNumericString(s: string): string {
  let out = '';
  for (const ch of s) out += /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
  return out;
}

function mod97(numeric: string): number {
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + (ch.charCodeAt(0) - 48)) % 97;
  return rem;
}

export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if ((iban.startsWith('CH') || iban.startsWith('LI')) && iban.length !== 21) return false;
  return mod97(toNumericString(iban.slice(4) + iban.slice(0, 4))) === 1;
}

/** QR-IBAN: CH/LI-IBAN, deren Instituts-Identifikation (Stellen 5–9) zwischen 30000 und 31999 liegt. */
export function isQrIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!(iban.startsWith('CH') || iban.startsWith('LI')) || iban.length !== 21) return false;
  const iid = parseInt(iban.slice(4, 9), 10);
  return iid >= 30000 && iid <= 31999;
}

export function formatIban(input: string): string {
  return normalizeIban(input).replace(/(.{4})/g, '$1 ').trim();
}

const MOD10_TABLE = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];

/** Prüfziffer nach Modulo 10, rekursiv (wie bei ESR/QR-Referenz). */
export function mod10CheckDigit(digits: string): number {
  let carry = 0;
  for (const ch of digits) carry = MOD10_TABLE[(carry + (ch.charCodeAt(0) - 48)) % 10];
  return (10 - carry) % 10;
}

/** 26 Stellen (links mit Nullen aufgefüllt) + Prüfziffer = 27-stellige QR-Referenz. */
export function buildQrrReference(base: string | number): string {
  const digits = String(base).replace(/\D/g, '');
  if (digits.length > 26) throw new Error('QR-Referenz: maximal 26 Stellen vor der Prüfziffer');
  const body = digits.padStart(26, '0');
  return body + mod10CheckDigit(body);
}

export function isValidQrrReference(ref: string): boolean {
  const r = (ref || '').replace(/\s+/g, '');
  return /^\d{27}$/.test(r) && mod10CheckDigit(r.slice(0, 26)) === Number(r[26]);
}

/** Creditor Reference nach ISO 11649: "RF" + 2 Prüfziffern + bis 21 alphanumerische Zeichen. */
export function buildScorReference(raw: string): string {
  const body = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (body.length === 0 || body.length > 21) throw new Error('SCOR-Referenz: 1 bis 21 Zeichen');
  const check = 98 - mod97(toNumericString(body + 'RF00'));
  return 'RF' + String(check).padStart(2, '0') + body;
}

export function isValidScorReference(ref: string): boolean {
  const r = (ref || '').replace(/\s+/g, '').toUpperCase();
  if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(r)) return false;
  return mod97(toNumericString(r.slice(4) + r.slice(0, 4))) === 1;
}

/** Darstellung der Referenz in Blöcken wie auf dem Zahlteil üblich. */
export function formatReference(type: ReferenceType, ref: string): string {
  const r = (ref || '').replace(/\s+/g, '');
  if (type === 'QRR') return (r.slice(0, 2) + ' ' + (r.slice(2).match(/.{1,5}/g) ?? []).join(' ')).trim();
  if (type === 'SCOR') return (r.match(/.{1,4}/g) ?? []).join(' ');
  return r;
}

const cut = (s: string, n: number) => (s || '').trim().slice(0, n);

export function addressLines(a: QRAddress): string[] {
  return [a.name, `${a.street} ${a.houseNo}`.trim(), `${a.zip} ${a.city}`.trim()].filter((l) => l !== '');
}

export function isCompleteAddress(a: QRAddress | null): a is QRAddress {
  return !!a && a.name.trim() !== '' && a.zip.trim() !== '' && a.city.trim() !== '' && (a.country || 'CH').trim() !== '';
}

function addressBlock(a: QRAddress | null): string[] {
  if (!a) return ['', '', '', '', '', '', ''];
  return ['S', cut(a.name, 70), cut(a.street, 70), cut(a.houseNo, 16), cut(a.zip, 16), cut(a.city, 35), cut(a.country || 'CH', 2).toUpperCase()];
}

/** Erzeugt den Textinhalt des Swiss QR Codes (Zeilen mit LF getrennt). */
export function buildQrPayload(d: QRBillData): string {
  const lines = [
    'SPC', // QRType
    '0200', // Version
    '1', // Coding: UTF-8
    normalizeIban(d.iban),
    ...addressBlock(d.creditor), // Zahlungsempfänger
    '', '', '', '', '', '', '', // Endgültiger Zahlungsempfänger (reserviert, leer)
    d.amount === null ? '' : (d.amount / 100).toFixed(2),
    d.currency,
    ...addressBlock(d.debtor), // Zahlungspflichtiger
    d.referenceType,
    d.referenceType === 'NON' ? '' : (d.reference || '').replace(/\s+/g, ''),
    cut(d.message, 140),
    'EPD', // Trailer
  ];
  return lines.join('\n');
}

/** Liefert eine Liste deutscher Fehlermeldungen; leer = alles in Ordnung. */
export function validateQrBill(d: QRBillData): string[] {
  const errors: string[] = [];
  const iban = normalizeIban(d.iban);
  if (!isValidIban(iban)) errors.push('Die IBAN ist ungültig.');
  else if (!(iban.startsWith('CH') || iban.startsWith('LI'))) errors.push('Für QR-Rechnungen ist nur eine Schweizer oder Liechtensteiner IBAN zulässig.');
  const qr = isQrIban(iban);
  if (qr && d.referenceType !== 'QRR') errors.push('Eine QR-IBAN erfordert eine QR-Referenz (QRR).');
  if (!qr && d.referenceType === 'QRR') errors.push('Eine QR-Referenz (QRR) ist nur zusammen mit einer QR-IBAN erlaubt.');
  if (d.referenceType === 'QRR' && !isValidQrrReference(d.reference)) errors.push('Die QR-Referenz ist ungültig.');
  if (d.referenceType === 'SCOR' && !isValidScorReference(d.reference)) errors.push('Die Creditor Reference (SCOR) ist ungültig.');
  if (!isCompleteAddress(d.creditor) || d.creditor.street.trim() === '') {
    errors.push('Die Adresse des Zahlungsempfängers ist unvollständig (Name, Strasse, PLZ, Ort).');
  }
  if (d.amount !== null && (d.amount < 1 || d.amount > 99_999_999_999)) errors.push('Der Betrag muss zwischen 0.01 und 999 999 999.99 liegen.');
  if (d.currency !== 'CHF' && d.currency !== 'EUR') errors.push('Nur CHF oder EUR sind erlaubt.');
  return errors;
}
