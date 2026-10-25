-- Keleo – initiales Datenbankschema (Cloudflare D1 / SQLite)
-- Geldbeträge werden immer in Rappen (INTEGER) gespeichert, Datumswerte als ISO-Text 'YYYY-MM-DD'.

CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT '',
  owner_name TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  house_no TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'CH',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  vat_number TEXT NOT NULL DEFAULT '',
  vat_enabled INTEGER NOT NULL DEFAULT 0,
  default_vat_rate REAL NOT NULL DEFAULT 8.1,
  iban TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  quote_valid_days INTEGER NOT NULL DEFAULT 30,
  invoice_prefix TEXT NOT NULL DEFAULT 'R',
  quote_prefix TEXT NOT NULL DEFAULT 'O',
  invoice_intro TEXT NOT NULL DEFAULT 'Vielen Dank für Ihren Auftrag. Wir erlauben uns, Ihnen folgende Leistungen in Rechnung zu stellen:',
  invoice_footer TEXT NOT NULL DEFAULT 'Vielen Dank für die pünktliche Überweisung.',
  quote_intro TEXT NOT NULL DEFAULT 'Vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgende Offerte:',
  quote_footer TEXT NOT NULL DEFAULT 'Wir freuen uns auf Ihren Auftrag und stehen für Fragen gerne zur Verfügung.',
  email_text_invoice TEXT NOT NULL DEFAULT 'Guten Tag {kunde}

Im Anhang finden Sie unsere Rechnung {nummer} über {betrag}, zahlbar bis {faellig}.

Freundliche Grüsse
{firma}',
  email_text_quote TEXT NOT NULL DEFAULT 'Guten Tag {kunde}

Vielen Dank für Ihre Anfrage. Im Anhang finden Sie unsere Offerte {nummer} über {betrag}, gültig bis {faellig}.

Freundliche Grüsse
{firma}',
  email_text_reminder TEXT NOT NULL DEFAULT 'Guten Tag {kunde}

Im Anhang finden Sie eine Zahlungserinnerung zur Rechnung {nummer}. Der offene Betrag beläuft sich auf {betrag}.

Freundliche Grüsse
{firma}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO settings (id) VALUES (1);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'company' CHECK (type IN ('company', 'private')),
  company TEXT NOT NULL DEFAULT '',
  salutation TEXT NOT NULL DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  house_no TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'CH',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notiz-Journal pro Kunde ("eigene Sachen", damit nichts vergessen geht)
CREATE TABLE customer_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);

-- Laufnummern pro Dokumentart und Jahr (z. B. R-2026-0001)
CREATE TABLE counters (
  kind TEXT NOT NULL,
  year INTEGER NOT NULL,
  next INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (kind, year)
);

-- Offerten und Rechnungen teilen sich eine Tabelle (kind = 'quote' | 'invoice')
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('quote', 'invoice')),
  number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'draft',
  date TEXT NOT NULL,
  due_date TEXT,
  title TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  footer TEXT NOT NULL DEFAULT '',
  discount_percent REAL NOT NULL DEFAULT 0,
  vat_enabled INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CHF',
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  vat_amount INTEGER NOT NULL DEFAULT 0,
  rounding INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  reference TEXT NOT NULL DEFAULT '',
  source_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  reminder_level INTEGER NOT NULL DEFAULT 0,
  reminder_at TEXT,
  sent_at TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_documents_kind_status ON documents(kind, status);
CREATE INDEX idx_documents_customer ON documents(customer_id);

CREATE TABLE document_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '',
  unit_price INTEGER NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 0,
  amount INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_document_items_doc ON document_items(document_id);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'bank',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_payments_doc ON payments(document_id);

-- Aufgaben / Pendenzen (optional mit Kunde oder Dokument verknüpft)
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  due_date TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tasks_done_due ON tasks(done, due_date);
