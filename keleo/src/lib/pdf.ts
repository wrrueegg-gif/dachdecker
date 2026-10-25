/**
 * PDF-Erzeugung mit pdf-lib (läuft ohne Node-Abhängigkeiten im Cloudflare Worker).
 * Rechnungen erhalten am Seitenende den Zahlteil mit Empfangsschein nach dem
 * Schweizer QR-Rechnungs-Standard (210 × 105 mm, Swiss QR Code 46 × 46 mm).
 */
import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb, type RGB } from 'pdf-lib';
import QRCode from 'qrcode';
import { customerAddressLines, customerName, type DocumentFull, type Settings } from '../db';
import { formatDate } from './dates';
import { KINDS } from './kinds';
import { formatAmount, formatQuantity } from './money';
import { addressLines, buildQrPayload, buildQrrReference, buildScorReference, formatIban, formatReference, isCompleteAddress, isQrIban, type QRBillData, type ReferenceType } from './qrbill';
import { computeTotals } from './totals';

const MM = 72 / 25.4;
const mm = (v: number) => v * MM;
const PAGE_W = mm(210);
const PAGE_H = mm(297);
const MARGIN_L = mm(20);
const MARGIN_R = mm(20);
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const GREY = rgb(0.42, 0.42, 0.42);
const LIGHT = rgb(0.8, 0.8, 0.8);
const FAINT = rgb(0.95, 0.95, 0.95);

// Zeichen ausserhalb von WinAnsi können die Standardschriften nicht darstellen.
const WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
export function sanitize(text: string): string {
  let out = '';
  for (const ch of (text ?? '').normalize('NFC')) {
    const code = ch.codePointAt(0)!;
    if (ch === '\n') out += ch;
    else if (ch === '\t') out += '  ';
    else if (code === 0xa0) out += ' ';
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa1 && code <= 0xff) || WINANSI_EXTRA.includes(ch)) out += ch;
    else if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) continue;
    else out += '?';
  }
  return out;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of sanitize(text).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const candidate = line === '' ? word : `${line} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line !== '') lines.push(line);
      let chunk = '';
      for (const ch of word) {
        if (chunk !== '' && font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines;
}

interface TextOpts {
  font?: PDFFont;
  color?: RGB;
  align?: 'left' | 'right' | 'center';
  maxWidth?: number;
}

class Writer {
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];
  readonly bottom = mm(20);

  constructor(readonly pdf: PDFDocument, readonly font: PDFFont, readonly bold: PDFFont) {
    this.addPage();
  }

  addPage(): void {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    this.y = PAGE_H - mm(20);
  }

  ensure(height: number): void {
    if (this.y - height < this.bottom) this.addPage();
  }

  text(x: number, baseline: number, str: string, size: number, opts: TextOpts = {}): void {
    const f = opts.font ?? this.font;
    let s = sanitize(str).replace(/\n/g, ' ');
    if (opts.maxWidth) {
      while (s.length > 1 && f.widthOfTextAtSize(s, size) > opts.maxWidth) s = s.slice(0, -1);
    }
    const w = f.widthOfTextAtSize(s, size);
    const xx = opts.align === 'right' ? x - w : opts.align === 'center' ? x - w / 2 : x;
    this.page.drawText(s, { x: xx, y: baseline, size, font: f, color: opts.color ?? BLACK });
  }

  /** Mehrzeiliger Text ab der aktuellen Position; rückt y vor und bricht Seiten um. */
  para(x: number, str: string, size: number, maxWidth: number, opts: { font?: PDFFont; color?: RGB; lineHeight?: number } = {}): void {
    const f = opts.font ?? this.font;
    const lh = opts.lineHeight ?? size * 1.4;
    for (const line of wrap(str, f, size, maxWidth)) {
      this.ensure(lh);
      this.text(x, this.y - size * 0.85, line, size, { font: f, color: opts.color });
      this.y -= lh;
    }
  }

  gap(h: number): void {
    this.y -= h;
  }

  hline(x1: number, y: number, x2: number, color: RGB = LIGHT, thickness = 0.5): void {
    this.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
  }
}

export interface RenderOptions {
  todayIso: string;
  /** 0 = normales Dokument, 1 = Zahlungserinnerung, 2 = 1. Mahnung, 3 = 2. Mahnung */
  reminderLevel?: number;
  /** Neue Zahlungsfrist bei Mahnungen */
  reminderDue?: string;
  /** Zahlteil anhängen (nur Rechnungen, nur wenn die QR-Daten gültig sind) */
  includeQrBill?: boolean;
}

export function referenceTypeOf(ref: string): ReferenceType {
  const r = (ref || '').replace(/\s+/g, '');
  if (/^\d{27}$/.test(r)) return 'QRR';
  if (/^RF\d{2}[A-Z0-9]{1,21}$/i.test(r)) return 'SCOR';
  return 'NON';
}

/** Ermittelt die Referenz einer Rechnung passend zur IBAN-Art (QR-IBAN → QRR, sonst SCOR). */
export function referenceFor(settings: Settings, doc: Pick<DocumentFull, 'id' | 'customer_id' | 'number'>): string {
  if (!settings.iban) return '';
  if (isQrIban(settings.iban)) {
    return buildQrrReference(String(doc.customer_id).padStart(6, '0') + String(doc.id).padStart(20, '0'));
  }
  const digits = doc.number.replace(/\D/g, '') || String(doc.id);
  return buildScorReference(digits.slice(0, 21));
}

export function creditorAddress(settings: Settings) {
  return {
    name: settings.company_name || settings.owner_name,
    street: settings.street,
    houseNo: settings.house_no,
    zip: settings.zip,
    city: settings.city,
    country: settings.country || 'CH',
  };
}

export function qrBillDataFor(settings: Settings, doc: DocumentFull, amount: number | null): QRBillData {
  const c = doc.customer;
  const debtorCandidate = { name: customerName(c), street: c.street, houseNo: c.house_no, zip: c.zip, city: c.city, country: c.country || 'CH' };
  return {
    iban: settings.iban,
    creditor: creditorAddress(settings),
    debtor: isCompleteAddress(debtorCandidate) ? debtorCandidate : null,
    amount,
    currency: doc.currency === 'EUR' ? 'EUR' : 'CHF',
    referenceType: referenceTypeOf(doc.reference),
    reference: doc.reference,
    message: `Rechnung ${doc.number}`,
  };
}

function reminderText(level: number, doc: DocumentFull, open: number, newDue: string): string {
  const amt = `${doc.currency} ${formatAmount(open)}`;
  const base = `Rechnung ${doc.number} vom ${formatDate(doc.date)}`;
  if (level === 1) {
    return `Sicher ist es Ihrer Aufmerksamkeit entgangen, dass unsere ${base} mit Fälligkeit ${formatDate(doc.due_date)} noch nicht bezahlt wurde. Wir bitten Sie, den offenen Betrag von ${amt} bis zum ${formatDate(newDue)} zu überweisen.\n\nSollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, betrachten Sie dieses bitte als gegenstandslos.`;
  }
  if (level === 2) {
    return `Trotz unserer Zahlungserinnerung ist die ${base} noch nicht bezahlt. Wir bitten Sie, den offenen Betrag von ${amt} bis zum ${formatDate(newDue)} zu überweisen.\n\nFalls Sie mit der Rechnung nicht einverstanden sind, melden Sie sich bitte umgehend bei uns.`;
  }
  return `Leider ist die ${base} trotz Zahlungserinnerung und erster Mahnung weiterhin offen. Wir fordern Sie letztmals auf, den Betrag von ${amt} bis zum ${formatDate(newDue)} zu überweisen. Nach unbenutztem Ablauf dieser Frist sehen wir uns gezwungen, ohne weitere Ankündigung rechtliche Schritte einzuleiten.`;
}

function drawLetterhead(w: Writer, s: Settings): void {
  let y = PAGE_H - mm(15);
  w.text(MARGIN_L, y, s.company_name || 'Firmenname (in den Einstellungen erfassen)', 12, { font: w.bold });
  y -= mm(5);
  const lines = [s.owner_name, `${s.street} ${s.house_no}`.trim(), `${s.zip} ${s.city}`.trim()].filter((l) => l !== '');
  for (const l of lines) {
    w.text(MARGIN_L, y, l, 9, { color: GREY });
    y -= mm(4);
  }
  const contact = [s.phone, s.email, s.website].filter((v) => v !== '').join('  ·  ');
  if (contact) {
    w.text(MARGIN_L, y, contact, 8, { color: GREY });
    y -= mm(4);
  }
  if (s.vat_enabled === 1 && s.vat_number) w.text(MARGIN_L, y, `MwSt-Nr. ${s.vat_number}`, 8, { color: GREY });
  w.hline(MARGIN_L, PAGE_H - mm(40), PAGE_W - MARGIN_R, LIGHT);
}

function drawItemsTable(w: Writer, doc: DocumentFull): void {
  const vat = doc.vat_enabled === 1;
  const L = MARGIN_L;
  const cols = vat
    ? { pos: L, desc: L + mm(9), descW: mm(76), qtyR: L + mm(99), unit: L + mm(102), unitW: mm(12), priceR: L + mm(136), vatR: L + mm(150), amtR: PAGE_W - MARGIN_R }
    : { pos: L, desc: L + mm(9), descW: mm(84), qtyR: L + mm(106), unit: L + mm(109), unitW: mm(14), priceR: L + mm(146), vatR: 0, amtR: PAGE_W - MARGIN_R };
  const size = 9.5;
  const lh = mm(4.6);

  const header = () => {
    w.ensure(mm(10));
    const top = w.y;
    w.page.drawRectangle({ x: MARGIN_L, y: top - mm(6.5), width: CONTENT_W, height: mm(6.5), color: FAINT });
    const by = top - mm(4.6);
    const h = { font: w.bold };
    w.text(cols.pos, by, 'Pos.', 8.5, h);
    w.text(cols.desc, by, 'Bezeichnung', 8.5, h);
    w.text(cols.qtyR, by, 'Menge', 8.5, { ...h, align: 'right' });
    w.text(cols.unit, by, 'Einheit', 8.5, h);
    w.text(cols.priceR, by, 'Preis', 8.5, { ...h, align: 'right' });
    if (vat) w.text(cols.vatR, by, 'MwSt', 8.5, { ...h, align: 'right' });
    w.text(cols.amtR, by, `Betrag ${doc.currency}`, 8.5, { ...h, align: 'right' });
    w.y = top - mm(7.5);
  };
  header();

  doc.items.forEach((it, idx) => {
    const lines = wrap(it.description, w.font, size, cols.descW);
    const h = lines.length * lh + mm(2.5);
    if (w.y - h < w.bottom) {
      w.addPage();
      header();
    }
    const by = w.y - mm(1.2) - size * 0.85;
    w.text(cols.pos, by, String(idx + 1), size, { color: GREY });
    lines.forEach((l, i) => w.text(cols.desc, by - i * lh, l, size));
    w.text(cols.qtyR, by, formatQuantity(it.quantity), size, { align: 'right' });
    w.text(cols.unit, by, it.unit, size, { maxWidth: cols.unitW });
    w.text(cols.priceR, by, formatAmount(it.unit_price), size, { align: 'right' });
    if (vat) w.text(cols.vatR, by, `${formatQuantity(it.vat_rate)} %`, size, { align: 'right' });
    w.text(cols.amtR, by, formatAmount(it.amount), size, { align: 'right' });
    w.y -= h;
    w.hline(MARGIN_L, w.y, PAGE_W - MARGIN_R, LIGHT, 0.4);
  });

  const t = computeTotals(doc.items, doc.discount_percent, vat, doc.currency);
  const labelX = MARGIN_L + mm(100);
  const valR = PAGE_W - MARGIN_R;
  const row = (label: string, value: string, strong = false) => {
    w.ensure(lh + mm(1));
    const by = w.y - size * 0.85 - mm(0.8);
    w.text(labelX, by, label, size, { font: strong ? w.bold : w.font });
    w.text(valR, by, value, size, { font: strong ? w.bold : w.font, align: 'right' });
    w.y -= lh + mm(0.8);
  };
  w.gap(mm(2));
  if (t.discount_amount !== 0 || t.vat_lines.length > 0 || t.rounding !== 0) row('Zwischensumme', formatAmount(t.subtotal));
  if (t.discount_amount !== 0) row(`Rabatt ${formatQuantity(doc.discount_percent)} %`, '- ' + formatAmount(t.discount_amount));
  for (const v of t.vat_lines) row(`MwSt ${formatQuantity(v.rate)} % von ${formatAmount(v.base)}`, formatAmount(v.amount));
  if (t.rounding !== 0) row('Rundung', formatAmount(t.rounding));
  w.ensure(lh + mm(3));
  w.hline(labelX, w.y, valR, BLACK, 0.8);
  w.gap(mm(1));
  row(`Total ${doc.currency}`, formatAmount(doc.total), true);
}

function drawReminderSummary(w: Writer, doc: DocumentFull, open: number): void {
  const size = 10;
  const lh = mm(5.5);
  const labelX = MARGIN_L;
  const valR = MARGIN_L + mm(90);
  const row = (label: string, value: string, strong = false) => {
    w.ensure(lh);
    const by = w.y - size * 0.85;
    w.text(labelX, by, label, size, { font: strong ? w.bold : w.font });
    w.text(valR, by, value, size, { font: strong ? w.bold : w.font, align: 'right' });
    w.y -= lh;
  };
  w.hline(MARGIN_L, w.y, valR, LIGHT);
  w.gap(mm(1.5));
  row(`Rechnung ${doc.number} vom ${formatDate(doc.date)}`, `${doc.currency} ${formatAmount(doc.total)}`);
  if (doc.paid > 0) row('Bereits bezahlt', `- ${formatAmount(doc.paid)}`);
  w.hline(MARGIN_L, w.y, valR, BLACK, 0.8);
  w.gap(mm(1.5));
  row('Offener Betrag', `${doc.currency} ${formatAmount(open)}`, true);
}

/** Erzeugt das PDF einer Offerte oder Rechnung (inkl. Mahnvarianten). */
export async function renderDocumentPdf(doc: DocumentFull, settings: Settings, opts: RenderOptions): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const meta = KINDS[doc.kind];
  const reminder = doc.kind === 'invoice' ? (opts.reminderLevel ?? 0) : 0;
  const open = doc.total - doc.paid;
  const newDue = opts.reminderDue ?? opts.todayIso;

  const titleText = reminder === 0 ? `${meta.singular} ${doc.number}` : reminder === 1 ? `Zahlungserinnerung ${doc.number}` : `${reminder - 1}. Mahnung ${doc.number}`;
  pdf.setTitle(titleText);
  pdf.setAuthor(settings.company_name);
  pdf.setCreator('Keleo');

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(pdf, font, bold);

  drawLetterhead(w, settings);

  // Adressfeld rechts (passend für Fenstercouverts C5 mit Fenster rechts)
  let ay = PAGE_H - mm(50);
  for (const line of customerAddressLines(doc.customer)) {
    w.text(mm(120), ay, line, 10);
    ay -= mm(4.6);
  }

  // Angaben links
  const rows: [string, string][] = [
    [doc.kind === 'invoice' ? 'Rechnungs-Nr.' : 'Offerten-Nr.', doc.number],
    ['Datum', formatDate(reminder === 0 ? doc.date : opts.todayIso)],
  ];
  if (doc.kind === 'invoice') rows.push(['Zahlbar bis', formatDate(reminder === 0 ? doc.due_date : newDue)]);
  else rows.push(['Gültig bis', formatDate(doc.due_date)]);
  rows.push(['Kunden-Nr.', doc.customer.number]);
  if (doc.source_number) rows.push(['Offerte', doc.source_number]);
  let my = PAGE_H - mm(50);
  for (const [label, value] of rows) {
    w.text(MARGIN_L, my, label, 9, { color: GREY });
    w.text(MARGIN_L + mm(30), my, value, 9);
    my -= mm(4.6);
  }

  // Ort, Datum und Titel
  w.y = PAGE_H - mm(92);
  w.text(MARGIN_L, w.y, `${settings.city ? settings.city + ', ' : ''}${formatDate(reminder === 0 ? doc.date : opts.todayIso)}`, 10);
  w.gap(mm(10));
  const title = reminder === 0 ? `${meta.singular} ${doc.number}` : reminder === 1 ? 'Zahlungserinnerung' : `${reminder - 1}. Mahnung`;
  w.text(MARGIN_L, w.y - 14 * 0.85, title, 14, { font: bold });
  w.gap(mm(7));
  if (reminder === 0 && doc.title) {
    w.para(MARGIN_L, doc.title, 11, CONTENT_W, { font: bold });
    w.gap(mm(1));
  }
  if (reminder > 0) {
    w.text(MARGIN_L, w.y - 9, `zu Rechnung ${doc.number} vom ${formatDate(doc.date)}`, 10, { color: GREY });
    w.gap(mm(7));
  }

  // Einleitung
  const intro = reminder === 0 ? doc.intro : reminderText(reminder, doc, open, newDue);
  if (intro) {
    w.para(MARGIN_L, intro, 10, CONTENT_W);
    w.gap(mm(4));
  }

  if (reminder === 0) drawItemsTable(w, doc);
  else drawReminderSummary(w, doc, open);

  // Zahlungsbedingungen / Gültigkeit
  w.gap(mm(6));
  if (doc.kind === 'invoice') {
    if (reminder === 0) {
      let terms = `Zahlbar bis ${formatDate(doc.due_date)}.`;
      if (settings.iban) terms += ` Bitte überweisen Sie den Betrag auf ${formatIban(settings.iban)}${settings.bank_name ? ` (${settings.bank_name})` : ''} – am einfachsten mit dem Zahlteil unten.`;
      w.para(MARGIN_L, terms, 9.5, CONTENT_W, { color: GREY });
    } else {
      w.para(MARGIN_L, `Bitte verwenden Sie für die Überweisung den Zahlteil unten; der offene Betrag ist bereits eingetragen.`, 9.5, CONTENT_W, { color: GREY });
    }
  } else {
    w.para(MARGIN_L, `Diese Offerte ist gültig bis ${formatDate(doc.due_date)}. Alle Preise in ${doc.currency}${doc.vat_enabled === 1 ? ' exkl. MwSt' : ''}.`, 9.5, CONTENT_W, { color: GREY });
  }

  if (doc.footer && reminder === 0) {
    w.gap(mm(5));
    w.para(MARGIN_L, doc.footer, 10, CONTENT_W);
  }
  w.gap(mm(6));
  w.ensure(mm(14));
  w.para(MARGIN_L, 'Freundliche Grüsse', 10, CONTENT_W);
  w.gap(mm(8));
  w.para(MARGIN_L, [settings.company_name, settings.owner_name].filter((v) => v !== '').join('\n'), 10, CONTENT_W);

  if (doc.kind === 'quote') {
    w.gap(mm(14));
    w.ensure(mm(20));
    w.hline(MARGIN_L, w.y, MARGIN_L + mm(70), BLACK, 0.5);
    w.hline(MARGIN_L + mm(90), w.y, PAGE_W - MARGIN_R, BLACK, 0.5);
    w.gap(mm(1));
    w.text(MARGIN_L, w.y - 8, 'Offerte angenommen – Ort, Datum', 8, { color: GREY });
    w.text(MARGIN_L + mm(90), w.y - 8, 'Unterschrift', 8, { color: GREY });
  }

  // Zahlteil
  if (doc.kind === 'invoice' && opts.includeQrBill && doc.status !== 'cancelled') {
    const amount = reminder > 0 ? open : doc.total;
    const data = qrBillDataFor(settings, doc, amount > 0 ? amount : null);
    if (w.y < mm(105) + mm(6)) w.addPage();
    await drawQrBill(w.page, pdf, font, bold, data);
  }

  // Seitenzahlen
  if (w.pages.length > 1) {
    w.pages.forEach((p, i) => {
      const s = `Seite ${i + 1} von ${w.pages.length}`;
      p.drawText(s, { x: PAGE_W - MARGIN_R - font.widthOfTextAtSize(s, 8), y: PAGE_H - mm(12), size: 8, font, color: GREY });
    });
  }

  return pdf.save();
}

/** Nur der Zahlteil mit Beispieldaten – zum Prüfen der Bankangaben in den Einstellungen. */
export async function renderQrTestPdf(settings: Settings, todayIso: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Keleo – Test Zahlteil');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const qr = isQrIban(settings.iban);
  const data: QRBillData = {
    iban: settings.iban,
    creditor: creditorAddress(settings),
    debtor: { name: 'Pia Beispiel', street: 'Musterweg', houseNo: '7', zip: '8001', city: 'Zürich', country: 'CH' },
    amount: 12345,
    currency: 'CHF',
    referenceType: qr ? 'QRR' : 'SCOR',
    reference: qr ? buildQrrReference('1') : buildScorReference('TEST1'),
    message: 'Testrechnung Keleo',
  };
  page.drawText(sanitize(`Test-Zahlteil (${formatDate(todayIso)}) – bitte mit der Banking-App scannen, aber nicht bezahlen.`), { x: MARGIN_L, y: PAGE_H - mm(30), size: 11, font: bold });
  page.drawText(sanitize('Prüfen Sie: Name/Adresse, IBAN, Referenzart und ob Ihre Bank den Code akzeptiert.'), { x: MARGIN_L, y: PAGE_H - mm(37), size: 10, font, color: GREY });
  await drawQrBill(page, pdf, font, bold, data);
  return pdf.save();
}

function cornerBox(page: PDFPage, x: number, yTop: number, w: number, h: number): void {
  const L = mm(3);
  const yB = yTop - h;
  const segs: [number, number, number, number][] = [
    [x, yTop, x + L, yTop], [x, yTop, x, yTop - L],
    [x + w, yTop, x + w - L, yTop], [x + w, yTop, x + w, yTop - L],
    [x, yB, x + L, yB], [x, yB, x, yB + L],
    [x + w, yB, x + w - L, yB], [x + w, yB, x + w, yB + L],
  ];
  for (const [x1, y1, x2, y2] of segs) page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.75, color: BLACK });
}

function drawQrCode(page: PDFPage, payload: string, x: number, y: number, size: number): void {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const m = size / n;
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) {
        c++;
        continue;
      }
      let e = c;
      while (e < n && qr.modules.get(r, e)) e++;
      page.drawRectangle({ x: x + c * m, y: y + size - (r + 1) * m, width: (e - c) * m, height: m + 0.05, color: BLACK });
      c = e;
    }
  }
  // Schweizer Kreuz (7 × 7 mm) in der Mitte
  const cx = x + size / 2;
  const cy = y + size / 2;
  const s = mm(7);
  const pad = mm(0.45);
  page.drawRectangle({ x: cx - s / 2 - pad, y: cy - s / 2 - pad, width: s + 2 * pad, height: s + 2 * pad, color: WHITE });
  page.drawRectangle({ x: cx - s / 2, y: cy - s / 2, width: s, height: s, color: BLACK });
  const armW = (s * 6) / 32;
  const armL = (s * 20) / 32;
  page.drawRectangle({ x: cx - armW / 2, y: cy - armL / 2, width: armW, height: armL, color: WHITE });
  page.drawRectangle({ x: cx - armL / 2, y: cy - armW / 2, width: armL, height: armW, color: WHITE });
}

const amountText = (rappen: number) => formatAmount(rappen).replace(/'/g, ' ');

/** Zeichnet Empfangsschein + Zahlteil in die unteren 105 mm der Seite. */
export async function drawQrBill(page: PDFPage, pdf: PDFDocument, font: PDFFont, bold: PDFFont, data: QRBillData): Promise<void> {
  const Y = (fromTop: number) => mm(105 - fromTop);
  const T = (x: number, baseline: number, s: string, size: number, b = false, align: 'left' | 'right' = 'left') => {
    const f = b ? bold : font;
    const str = sanitize(s).replace(/\n/g, ' ');
    const w = f.widthOfTextAtSize(str, size);
    page.drawText(str, { x: align === 'right' ? x - w : x, y: baseline, size, font: f, color: BLACK });
  };

  // Trennlinien mit Scherensymbol
  page.drawLine({ start: { x: 0, y: mm(105) }, end: { x: mm(210), y: mm(105) }, thickness: 0.5, color: BLACK });
  page.drawLine({ start: { x: mm(62), y: 0 }, end: { x: mm(62), y: mm(105) }, thickness: 0.5, color: BLACK });
  try {
    const dingbats = await pdf.embedFont(StandardFonts.ZapfDingbats);
    page.drawText('"', { x: mm(8), y: mm(105) - 3.5, size: 10, font: dingbats, color: BLACK });
    page.drawText('"', { x: mm(62) + 3.5, y: mm(105) - mm(8), size: 10, font: dingbats, color: BLACK, rotate: { type: 'degrees', angle: 90 } as never });
  } catch {
    // Scherensymbol ist optional
  }

  const refType = data.referenceType;
  const refText = refType === 'NON' ? '' : formatReference(refType, data.reference);
  const creditorLines = [formatIban(data.iban), ...addressLines(data.creditor)];
  const debtorLines = data.debtor ? addressLines(data.debtor) : null;

  // ---------------- Empfangsschein (links, 62 mm) ----------------
  const rx = mm(5);
  T(rx, Y(5) - 11 * 0.8, 'Empfangsschein', 11, true);
  let cy = Y(12);
  const groupR = (heading: string, lines: string[]) => {
    T(rx, cy - 6 * 0.8, heading, 6, true);
    cy -= 9;
    for (const l of lines) {
      T(rx, cy - 8 * 0.8, l, 8);
      cy -= 9;
    }
    cy -= 9;
  };
  groupR('Konto / Zahlbar an', creditorLines);
  if (refText) groupR('Referenz', [refText]);
  if (debtorLines) groupR('Zahlbar durch', debtorLines);
  else {
    T(rx, cy - 6 * 0.8, 'Zahlbar durch (Name/Adresse)', 6, true);
    cy -= 9;
    cornerBox(page, rx, cy, mm(52), mm(20));
  }
  // Betrag
  T(rx, Y(68) - 6 * 0.8, 'Währung', 6, true);
  T(rx + mm(16), Y(68) - 6 * 0.8, 'Betrag', 6, true);
  T(rx, Y(68) - 6 * 0.8 - 9, data.currency, 8);
  if (data.amount !== null) T(rx + mm(16), Y(68) - 6 * 0.8 - 9, amountText(data.amount), 8);
  else cornerBox(page, mm(27), Y(68) - 2, mm(30), mm(10));
  // Annahmestelle
  T(mm(57), Y(82) - 6 * 0.8, 'Annahmestelle', 6, true, 'right');

  // ---------------- Zahlteil (rechts, 148 mm) ----------------
  const px = mm(67);
  T(px, Y(5) - 11 * 0.8, 'Zahlteil', 11, true);
  drawQrCode(page, buildQrPayload(data), px, Y(17 + 46), mm(46));
  // Betrag
  T(px, Y(68) - 8 * 0.8, 'Währung', 8, true);
  T(px + mm(20), Y(68) - 8 * 0.8, 'Betrag', 8, true);
  T(px, Y(68) - 8 * 0.8 - 11, data.currency, 10);
  if (data.amount !== null) T(px + mm(20), Y(68) - 8 * 0.8 - 11, amountText(data.amount), 10);
  else cornerBox(page, px + mm(6), Y(68) - 11, mm(40), mm(15));
  // Angaben
  const ix = mm(118);
  const infoW = mm(87);
  let iy = Y(5);
  const groupP = (heading: string, lines: string[]) => {
    T(ix, iy - 8 * 0.8, heading, 8, true);
    iy -= 11;
    for (const l of lines) {
      for (const part of wrap(l, font, 10, infoW)) {
        T(ix, iy - 10 * 0.8, part, 10);
        iy -= 11;
      }
    }
    iy -= 11;
  };
  groupP('Konto / Zahlbar an', creditorLines);
  if (refText) groupP('Referenz', [refText]);
  if (data.message) groupP('Zusätzliche Informationen', [data.message]);
  if (debtorLines) groupP('Zahlbar durch', debtorLines);
  else {
    T(ix, iy - 8 * 0.8, 'Zahlbar durch (Name/Adresse)', 8, true);
    iy -= 11;
    cornerBox(page, ix, iy, mm(65), mm(25));
  }
}
