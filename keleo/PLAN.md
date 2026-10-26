# Keleo – Plan

Stand: 26. Oktober 2026. Keleo ist ein kleines, selbst gehostetes Rechnungs- und Offertenprogramm für die Schweiz, angelehnt an den Aufbau von koleo.ch, betrieben auf Vercel mit einer Postgres-Datenbank bei Supabase. (Die erste Fassung lief auf Cloudflare Workers + D1; der Wechsel auf Vercel erfolgte am 26. Oktober auf Wunsch, weil Vercel und Supabase direkt aus der Claude-Umgebung eingerichtet werden können.) Dieses Dokument beschreibt Ziel, Recherche, Architektur, Datenmodell, den umgesetzten Funktionsumfang (Phase 1), die nächsten Schritte und die offenen Entscheidungen.

## 1. Ziel in einem Satz

Rechnungen und Offerten in wenigen Klicks erstellen, als PDF mit Schweizer QR-Rechnung versenden, Zahlungen verbuchen, und auf einer Übersicht jederzeit sehen, was offen ist und was erledigt werden muss – ohne monatliche Software-Gebühren und mit eigenen Daten unter eigener Kontrolle.

## 2. Was Koleo macht und was Keleo daraus übernimmt

Koleo (koleo.ch, ab 2024 mit 7-Tage-Test und anschliessendem Abo) ist eine Online-Rechnungsstellung für Selbständige und KMU. Aus den öffentlichen Hilfeseiten ergibt sich dieser Aufbau:

| Bereich bei Koleo | Was Keleo macht |
|---|---|
| Kunden müssen zuerst erfasst werden, bevor Dokumente erstellt werden | Gleich. Kundenstamm mit Firma/Privat, strukturierter Adresse, E-Mail, Telefon |
| Rechnungen: Positionen mit Beschreibung, Menge, Preis; Rabatt auf Rechnungsebene; MwSt-Satz wählbar | Gleich, plus Rabatt in Prozent, MwSt pro Position (8.1 / 2.6 / 3.8 %), Rappenrundung |
| Offerten: gleiches Formular wie Rechnung, mit Nummer, Datum und Gültigkeit | Gleich, plus «In Rechnung umwandeln» und Status angenommen/abgelehnt |
| Dokument kopieren als Vorlage | Gleich («Kopieren») |
| Versand per E-Mail (nach Aktivierung in den Einstellungen) | Über Resend, optional; sonst PDF herunterladen und «Als gesendet markieren» |
| Zahlungen verbuchen, Status gesendet → bezahlt | Gleich, inkl. Teilzahlungen, Zahlungsart (Bank, Bar, TWINT) |
| Zahlungserinnerung, 1. Mahnung, 2. Mahnung | Gleich, mit eigenem PDF (offener Betrag im Zahlteil) und neuer 10-Tage-Frist |
| QR-Rechnung automatisch, Bankdaten aus den Einstellungen | Gleich, inkl. QR-IBAN-Erkennung und Test-Zahlteil |
| Einstellungen: Firma, Logo, Kontonummer, Fristen, E-Mail, MwSt | Gleich bis auf Logo (Phase 2) |
| Produkte/Artikelstamm, Gutschriften | Phase 2 |
| Konto & Abonnement | Entfällt – Keleo läuft auf dem eigenen Vercel- und Supabase-Konto |

Zusätzlich zu Koleo hat Keleo:

- **Eigene Angaben je Kunde**: ein freies Bemerkungsfeld (Vereinbarungen, Zugänge, Besonderheiten) und ein **Notiz-Journal** mit Zeitstempel, damit nichts vergessen geht.
- **Aufgaben/Pendenzen** mit Fälligkeit, optional einem Kunden zugeordnet.
- **Übersicht («Backend»)** mit Kennzahlen (offen, überfällig, offene Offerten, eingenommen im Jahr) und einer automatisch zusammengestellten **«Zu erledigen»-Liste**: überfällige Rechnungen mit nächstem Mahnschritt, abgelaufene oder unbeantwortete Offerten, fällige Aufgaben, liegengebliebene Entwürfe.

## 3. Architektur

```
Browser ──HTTPS──▶ Vercel Function (Hono, TypeScript, Node 22, Region Frankfurt)
                     ├── HTML-Seiten (serverseitig gerendertes JSX, wenig JavaScript)
                     ├── PDF-Erzeugung (pdf-lib + qrcode, reines JavaScript)
                     ├── E-Mail (Resend-API, optional)
                     └── Postgres bei Supabase (Schema «keleo», über den Transaction-Pooler)
                   Statische Dateien: public/ (app.css, app.js, favicon.svg) direkt vom Vercel-CDN
Lokal: derselbe Code mit Node und PGlite (Postgres als WebAssembly, Daten im Ordner .data/)
```

Entscheide und Gründe:

- **Vercel statt eigenem Server**: nichts zu warten, automatisch HTTPS, Hobby-Plan kostenlos und für eine Einzelfirma mehr als ausreichend (1 Mio. Funktionsaufrufe, 100 GB Transfer pro Monat). Vercel erkennt Hono automatisch, es braucht keinen Build-Schritt.
- **Postgres bei Supabase**: Vercel hat keine eigene Datenbank mehr; Supabase bietet im Free-Plan 500 MB Postgres, was für viele tausend Rechnungen reicht. Die Tabellen liegen im eigenen Schema `keleo` und werden über eine eigene Datenbankrolle angesprochen, damit sie nicht über die öffentliche Supabase-Daten-API erreichbar sind.
- **PGlite für lokal und Tests**: echtes Postgres im Prozess, kein Docker, keine Installation. Die Datenbanktests laufen dagegen, damit das SQL vor dem Veröffentlichen geprüft ist.
- **Hono mit serverseitigem JSX**: kleines Framework, Seiten werden als HTML gerendert, Formulare klassisch abgeschickt; nur der Positionen-Editor hat etwas JavaScript.
- **PDF mit pdf-lib**: Zahlteil und Empfangsschein werden selbst nach den SIX-Massvorgaben gezeichnet; keine externen Dienste.
- **Einzelbenutzer-Login** mit Passwort aus einer Umgebungsvariable und signiertem Cookie.

## 4. Vercel und Supabase – was es ist und was es kostet

**Vercel (Hosting)**, Hobby-Plan kostenlos: 100 GB Datentransfer, 1 Mio. Funktionsaufrufe und 4 Stunden aktive Rechenzeit pro Monat, automatisches HTTPS, eigene Domain möglich. Keleo braucht davon einen Bruchteil. Der Hobby-Plan ist für nicht-kommerzielle Nutzung gedacht; für den Firmeneinsatz empfiehlt Vercel den Pro-Plan (USD 20/Monat). Das ist bei Bedarf ein Klick, der Code bleibt gleich.

**Supabase (Datenbank)**, Free-Plan kostenlos: 500 MB Postgres, 2 aktive Projekte, Projekte werden nach einer Woche ohne Zugriff pausiert (im Dashboard mit einem Klick wieder aktivierbar). Pro-Plan ab USD 25/Monat mit täglichen Backups und 8 GB. Für Keleo reicht der Free-Plan; eine Rechnung mit fünf Positionen belegt etwa 2 KB.

Weitere Punkte:

- **Backups**: Im Free-Plan keine automatischen Backups; Empfehlung: regelmässiger Export (Phase 2 in Keleo als CSV/SQL) oder Pro-Plan.
- **Standort**: Supabase-Projekt in Frankfurt (eu-central-1), Vercel-Funktion in Frankfurt (fra1) – kurze Wege, Daten in der EU.
- **Pausierung**: Wird das Supabase-Projekt pausiert, zeigt Keleo eine Fehlerseite; nach dem Reaktivieren läuft es ohne weitere Schritte weiter.

## 5. Datenmodell

| Tabelle | Inhalt |
|---|---|
| `settings` | Eine Zeile: Firma, Adresse, Kontakt, MwSt, IBAN/QR-IBAN, Fristen, Präfixe, Standardtexte, E-Mail-Vorlagen |
| `customers` | Kunden (Firma oder Privat), strukturierte Adresse, E-Mail, Telefon, freie Bemerkungen, archiviert-Flag |
| `customer_notes` | Notiz-Journal je Kunde mit Zeitstempel |
| `documents` | Offerten und Rechnungen (Feld `kind`), Nummer, Status, Datum, Fälligkeit/Gültigkeit, Texte, Rabatt, Summen in Rappen, QR-Referenz, Mahnstufe, Verweis auf die Quell-Offerte |
| `document_items` | Positionen: Beschreibung, Menge, Einheit, Preis, MwSt-Satz, Betrag |
| `payments` | Zahlungen je Rechnung: Datum, Betrag, Art, Bemerkung |
| `tasks` | Aufgaben mit Fälligkeit, optional Kunde oder Dokument |
| `counters` | Laufnummern je Dokumentart und Jahr (R-2026-0001, O-2026-0001) |

Beträge werden konsequent als ganze Rappen gespeichert; Daten als ISO-Text. Statuswerte: Offerte `draft → sent → accepted/declined → invoiced`, Rechnung `draft → sent → paid` bzw. `cancelled`; «überfällig», «teilbezahlt» und «abgelaufen» werden aus Fälligkeit und Zahlungen abgeleitet.

## 6. Phase 1 – umgesetzt in diesem Stand

- [x] Login mit Passwort (Umgebungsvariable), Session-Cookie, CSRF-Schutz
- [x] Einstellungen inkl. IBAN-Prüfung, QR-IBAN-Erkennung und Test-Zahlteil
- [x] Kunden: Liste mit Suche, Anlegen/Bearbeiten, Archivieren, Bemerkungen, Notiz-Journal, Aufgaben je Kunde
- [x] Offerten: Erstellen mit Positionen-Editor (Live-Summen), PDF mit Unterschriftszeile, Status, Kopieren, Umwandeln in Rechnung
- [x] Rechnungen: Erstellen, PDF mit Zahlteil und Empfangsschein, Status, Zahlungen (Teilzahlung → teilbezahlt, voll → bezahlt), Stornieren, Kopieren
- [x] Mahnwesen: Zahlungserinnerung, 1. und 2. Mahnung als eigenes PDF mit offenem Betrag und neuer Frist
- [x] QR-Rechnung: QR-Referenz (bei QR-IBAN) oder Creditor Reference (bei normaler IBAN), strukturierte Adressen, Validierung mit klaren Fehlermeldungen
- [x] E-Mail-Versand über Resend mit PDF-Anhang und Vorlagen mit Platzhaltern (sobald die Umgebungsvariablen gesetzt sind)
- [x] Übersicht mit Kennzahlen und «Zu erledigen»-Liste
- [x] Aufgabenliste
- [x] Mobile-taugliches Layout
- [x] Tests für QR-Rechnung, Summenlogik und Datenbank (PGlite), Typprüfung, lokaler Dev-Server ohne Installation

Geprüft wurde der komplette Ablauf lokal: Einstellungen → Kunde → Offerte → Rechnung → Teilzahlung → Mahnung → PDFs. Die erzeugten Swiss QR Codes wurden maschinell ausgelesen und entsprechen dem vorgeschriebenen Aufbau (31 Zeilen, Version 0200, Adresstyp S, gültige Prüfziffern).

## 7. QR-Rechnung – worauf es ankommt

- **Standard**: Swiss QR-bill nach den Implementation Guidelines von SIX, Version 2.3. Seit dem **21. November 2025** sind nur noch **strukturierte Adressen** (Strasse und Hausnummer getrennt) erlaubt; kombinierte Adressen (Typ K) werden von den Banken schrittweise abgelehnt. Keleo erzeugt ausschliesslich Typ S.
- **QR-IBAN oder IBAN**: Mit einer **QR-IBAN** (bei der Bank beantragen, kostenlos oder sehr günstig) erhält jede Rechnung eine 27-stellige QR-Referenz; die Bank liefert eingehende Zahlungen mit dieser Referenz, was den automatischen Abgleich in Phase 2 ermöglicht. Mit einer **normalen IBAN** wird eine Creditor Reference (RF…) nach ISO 11649 verwendet; das ist ebenfalls zulässig, aber nicht alle Banken liefern diese Referenz strukturiert zurück.
- **Zahlungspflichtiger**: Wenn die Kundenadresse unvollständig ist, bleibt das Feld im Zahlteil leer (erlaubt), und Keleo weist darauf hin.
- **Prüfung vor dem ersten Versand**: Test-Zahlteil in den Einstellungen mit der eigenen Banking-App scannen; zusätzlich eine echte Rechnung bei der Bank oder über den SIX-Validierungsdienst prüfen lassen.
- **Druck**: Zahlteil immer unten auf einer A4-Seite, Trennlinien mit Scherensymbol; wird in der Regel auf Seite 2 gesetzt, wenn Seite 1 voll ist.

## 8. E-Mail-Versand – Optionen

| Option | Kosten | Einschätzung |
|---|---|---|
| **Resend** (umgesetzt) | kostenlos bis 3'000 Mails/Monat, eigene Domain nötig | Einfachste Lösung, 2 Umgebungsvariablen setzen, fertig |
| Manuell | kostenlos | PDF herunterladen, mit dem eigenen Mailprogramm senden, Rechnung «Als gesendet markieren» |

## 9. Sicherheit und Betrieb

- Passwort und Session-Secret liegen als Umgebungsvariablen bei Vercel, nie im Code.
- Alle schreibenden Aktionen sind nur mit gültiger Session und nur von derselben Origin möglich.
- HTTPS ist bei Vercel automatisch; Vorschau-Deployments sind zusätzlich durch Vercel-Login geschützt.
- Die Datenbank ist nur über die eigene Rolle und das Schema `keleo` erreichbar, nicht über die Supabase-Daten-API.
- Kein Tracking, keine externen Skripte; Schrift ist die Systemschrift.
- Empfehlung: Passwort mit mindestens 16 Zeichen, regelmässiger Datenexport.

## 10. Nächste Phasen

**Phase 2 – Komfort (je ½–1 Tag)**

1. Artikel-/Leistungsstamm: häufige Positionen speichern und per Klick einfügen (wie Koleo «Produkte»).
2. Logo-Upload für PDF und Briefkopf (Speicherung in Vercel Blob oder als kleines PNG in der Datenbank).
3. Gutschriften (negative Dokumente) und Stornorechnungen.
4. Zahlungsabgleich: camt.054-Datei der Bank hochladen → Zahlungen mit QR-Referenz werden automatisch verbucht.
5. Export: CSV-Listen (Rechnungen, Zahlungen, Kunden) für Treuhänder oder Buchhaltung.
6. Automatischer monatlicher Datenbank-Export (Vercel Cron Job).
7. Mahngebühren und Standard-Mahntexte in den Einstellungen.

**Phase 3 – Ausbau (nach Bedarf)**

- Wiederkehrende Rechnungen (Abos, Wartungsverträge).
- Zeiterfassung mit Übernahme in Rechnungspositionen.
- Mehrere Benutzer mit eigenen Logins und Rollen.
- Kundenportal-Link: Kunde kann Offerte online annehmen.
- Dunkles Farbschema.
- Zweisprachige Dokumente (DE/FR/IT/EN) für den Zahlteil und die Texte.

## 11. Veröffentlichung

Keleo ist als Vercel-Projekt `keleo` mit diesem Repository verbunden (Root-Verzeichnis `keleo`, Framework Hono, Node 22, Region Frankfurt). Die Datenbank liegt bei Supabase; die Tabellen legt Keleo beim ersten Start selbst an. Die nötigen Umgebungsvariablen und die einmalige Einrichtung der Datenbankrolle sind im [README](./README.md) beschrieben.

## 12. Offene Entscheidungen

1. **QR-IBAN**: Hast du schon eine QR-IBAN von deiner Bank, oder sollen Rechnungen vorerst mit der normalen IBAN und RF-Referenz erstellt werden?
2. **Mehrwertsteuer**: Bist du MWST-pflichtig (Umsatz über CHF 100'000)? Standardmässig ist die MwSt ausgeschaltet.
3. **E-Mail-Versand**: Soll der Versand direkt aus Keleo erfolgen (Resend-Konto und eigene Domain nötig) oder reicht PDF-Download und Versand aus dem Mailprogramm?
4. **Domain**: Eigene Domain (z. B. `rechnungen.deinefirma.ch`) oder die kostenlose `workers.dev`-Adresse?
5. **Logo** auf den Dokumenten gewünscht (Phase 2)?
6. **Ablage**: Keleo liegt jetzt als Ordner `keleo/` in diesem Repository. Soll es ein eigenes Repository werden (empfohlen, sobald es produktiv läuft)?

## 13. Quellen

- Koleo Hilfe: koleo.ch/help (Rechnungen erstellen, Offerten erstellen, Zahlungserinnerungen & Mahnungen, Kunden erfassen, QR-Rechnung, Konto & Abonnement)
- Vercel: vercel.com/docs/frameworks/backend/hono, vercel.com/docs/plans/hobby
- Supabase: supabase.com/docs/guides/database/connecting-to-postgres (Pooler), supabase.com/pricing
- SIX Implementation Guidelines QR-bill v2.3 und Factsheet zur Übergangsfrist (strukturierte Adressen ab 21.11.2025): six-group.com (Banking Services → QR-bill)
- Resend: resend.com (Free-Plan 3'000 E-Mails/Monat)
