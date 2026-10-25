# Keleo – Plan

Stand: 25. Oktober 2026. Keleo ist ein kleines, selbst gehostetes Rechnungs- und Offertenprogramm für die Schweiz, angelehnt an den Aufbau von koleo.ch, betrieben auf Cloudflare mit der Datenbank D1. Dieses Dokument beschreibt Ziel, Recherche, Architektur, Datenmodell, den umgesetzten Funktionsumfang (Phase 1), die nächsten Schritte und die offenen Entscheidungen.

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
| Konto & Abonnement | Entfällt – Keleo läuft auf dem eigenen Cloudflare-Konto |

Zusätzlich zu Koleo hat Keleo:

- **Eigene Angaben je Kunde**: ein freies Bemerkungsfeld (Vereinbarungen, Zugänge, Besonderheiten) und ein **Notiz-Journal** mit Zeitstempel, damit nichts vergessen geht.
- **Aufgaben/Pendenzen** mit Fälligkeit, optional einem Kunden zugeordnet.
- **Übersicht («Backend»)** mit Kennzahlen (offen, überfällig, offene Offerten, eingenommen im Jahr) und einer automatisch zusammengestellten **«Zu erledigen»-Liste**: überfällige Rechnungen mit nächstem Mahnschritt, abgelaufene oder unbeantwortete Offerten, fällige Aufgaben, liegengebliebene Entwürfe.

## 3. Architektur

```
Browser ──HTTPS──▶ Cloudflare Worker (Hono, TypeScript)
                     ├── HTML-Seiten (serverseitig gerendertes JSX, wenig JavaScript)
                     ├── PDF-Erzeugung (pdf-lib + qrcode, reines JavaScript)
                     ├── E-Mail (Resend-API, optional)
                     └── D1-Datenbank (SQLite, serverlos)
                   Static Assets: app.css, app.js, favicon.svg (direkt vom Edge)
```

Entscheide und Gründe:

- **Cloudflare Workers statt klassischem Server**: kein Server zu warten, automatisch HTTPS, weltweit schnell, im Workers-Free-Plan für diese Nutzung kostenlos (100'000 Requests/Tag).
- **D1 als Datenbank**: Das ist die Datenbank, die du gelesen hast. D1 ist Cloudflares serverlose SQL-Datenbank auf SQLite-Basis, direkt aus dem Worker ansprechbar, mit Migrationen, Backups (Time Travel) und einem kostenlosen Kontingent, das für eine Einzelfirma bei weitem reicht (Zahlen in Abschnitt 4).
- **Hono mit serverseitigem JSX**: kleines, Workers-natives Framework. Seiten werden auf dem Server als HTML gerendert, Formulare werden klassisch abgeschickt. Das hält den Code einfach, braucht keinen Frontend-Build und funktioniert auch auf dem Handy. Nur der Positionen-Editor hat etwas JavaScript (Zeilen hinzufügen, Live-Summen).
- **PDF im Worker mit pdf-lib**: Die bekannte Bibliothek `swissqrbill` baut auf PDFKit auf und läuft nicht ohne Weiteres in Workers. Darum zeichnet Keleo den Zahlteil selbst nach den SIX-Massvorgaben (Empfangsschein 62 mm, Zahlteil 148 mm, Swiss QR Code 46 × 46 mm mit Schweizer Kreuz) und nutzt die Standardschrift Helvetica. Das läuft ohne Browser-Rendering und ohne externe Dienste.
- **Einzelbenutzer-Login** mit Passwort aus einem Secret und signiertem Cookie. Bei Bedarf kann Cloudflare Access (kostenlos bis 50 Benutzer) als zweite Schicht vorgeschaltet werden.

## 4. Cloudflare D1 – was es ist und was es kostet

D1 ist eine verwaltete SQL-Datenbank mit SQLite-Semantik. Der Worker spricht sie über ein «Binding» (`env.DB`) direkt an, ohne Verbindungsdaten oder Passwörter. Die Tabellen werden mit SQL-Migrationsdateien angelegt (`migrations/0001_init.sql`), lokal und in der Cloud mit demselben Befehl.

Grenzen und Kosten laut Cloudflare-Dokumentation (Stand Oktober 2026):

| | Workers Free (kostenlos) | Workers Paid (USD 5/Monat) |
|---|---|---|
| Zeilen lesen | 5 Mio. pro Tag | 25 Mrd. pro Monat inklusive, danach USD 0.001 pro Mio. |
| Zeilen schreiben | 100'000 pro Tag | 50 Mio. pro Monat inklusive, danach USD 1.00 pro Mio. |
| Speicher | 5 GB gesamt | 5 GB inklusive, danach USD 0.75 pro GB und Monat |
| Grösse pro Datenbank | 500 MB | 10 GB |
| Datenbanken pro Konto | 10 | 50'000 |
| Time Travel (Wiederherstellung auf einen Zeitpunkt) | 7 Tage | 30 Tage |

Einordnung: Eine Rechnung mit fünf Positionen belegt etwa 2 KB. Selbst mit 10'000 Rechnungen und allen Kunden, Notizen und Zahlungen bleibt die Datenbank unter 50 MB – also weit unter dem Free-Limit. Die täglichen Lese-/Schreibkontingente reicht ein einzelner Benutzer in der Praxis nicht aus. Der Free-Plan ist für Keleo die Empfehlung; der Paid-Plan wird nur interessant, wenn längere Backup-Fenster (30 statt 7 Tage) gewünscht sind.

Weitere Punkte:

- **Backups**: D1 Time Travel erlaubt die Wiederherstellung auf jede Minute der letzten 7 Tage (Free). Zusätzlich lässt sich die Datenbank jederzeit mit `wrangler d1 export keleo --remote --output backup.sql` als SQL-Datei sichern (Phase 2: automatischer monatlicher Export).
- **Standort**: D1 wählt den Standort beim Erstellen automatisch; mit `--location weur` kann Westeuropa erzwungen werden (`npx wrangler d1 create keleo --location weur`). Für Schweizer Kundendaten ist das empfehlenswert.
- **Eine Datenbank, ein Worker**: Keleo braucht genau eine D1-Datenbank und einen Worker. Beides wird im kostenlosen Cloudflare-Konto angelegt.

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

- [x] Login mit Passwort (Secret), Session-Cookie, CSRF-Schutz
- [x] Einstellungen inkl. IBAN-Prüfung, QR-IBAN-Erkennung und Test-Zahlteil
- [x] Kunden: Liste mit Suche, Anlegen/Bearbeiten, Archivieren, Bemerkungen, Notiz-Journal, Aufgaben je Kunde
- [x] Offerten: Erstellen mit Positionen-Editor (Live-Summen), PDF mit Unterschriftszeile, Status, Kopieren, Umwandeln in Rechnung
- [x] Rechnungen: Erstellen, PDF mit Zahlteil und Empfangsschein, Status, Zahlungen (Teilzahlung → teilbezahlt, voll → bezahlt), Stornieren, Kopieren
- [x] Mahnwesen: Zahlungserinnerung, 1. und 2. Mahnung als eigenes PDF mit offenem Betrag und neuer Frist
- [x] QR-Rechnung: QR-Referenz (bei QR-IBAN) oder Creditor Reference (bei normaler IBAN), strukturierte Adressen, Validierung mit klaren Fehlermeldungen
- [x] E-Mail-Versand über Resend mit PDF-Anhang und Vorlagen mit Platzhaltern (sobald die Secrets gesetzt sind)
- [x] Übersicht mit Kennzahlen und «Zu erledigen»-Liste
- [x] Aufgabenliste
- [x] Mobile-taugliches Layout
- [x] Unit-Tests für QR-Rechnung und Summenlogik, Typprüfung, lokaler Dev-Server mit lokaler D1

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
| **Resend** (umgesetzt) | kostenlos bis 3'000 Mails/Monat, eigene Domain nötig | Einfachste Lösung, 2 Secrets setzen, fertig |
| Cloudflare Email Service | in Beta (seit 2026), braucht Workers Paid | Später interessant, API kann sich noch ändern |
| Manuell | kostenlos | PDF herunterladen, mit dem eigenen Mailprogramm senden, Rechnung «Als gesendet markieren» |

## 9. Sicherheit und Betrieb

- Passwort und Session-Secret liegen als Cloudflare-Secrets, nie im Code.
- Alle schreibenden Aktionen sind nur mit gültiger Session und nur von derselben Origin möglich.
- HTTPS ist bei Cloudflare automatisch.
- Empfehlung für den Betrieb: zusätzlich Cloudflare Access aktivieren (Anmeldung per E-Mail-Code vor der App), regelmässiger Export der Datenbank, Passwort mit mindestens 16 Zeichen.
- Kein Tracking, keine externen Skripte; Schrift ist die Systemschrift.

## 10. Nächste Phasen

**Phase 2 – Komfort (je ½–1 Tag)**

1. Artikel-/Leistungsstamm: häufige Positionen speichern und per Klick einfügen (wie Koleo «Produkte»).
2. Logo-Upload für PDF und Briefkopf (Speicherung in Cloudflare R2 oder als kleines PNG in D1).
3. Gutschriften (negative Dokumente) und Stornorechnungen.
4. Zahlungsabgleich: camt.054-Datei der Bank hochladen → Zahlungen mit QR-Referenz werden automatisch verbucht.
5. Export: CSV-Listen (Rechnungen, Zahlungen, Kunden) für Treuhänder oder Buchhaltung.
6. Automatischer monatlicher Datenbank-Export (Cron-Trigger des Workers).
7. Mahngebühren und Standard-Mahntexte in den Einstellungen.

**Phase 3 – Ausbau (nach Bedarf)**

- Wiederkehrende Rechnungen (Abos, Wartungsverträge).
- Zeiterfassung mit Übernahme in Rechnungspositionen.
- Mehrere Benutzer (Cloudflare Access + Rollen).
- Kundenportal-Link: Kunde kann Offerte online annehmen.
- Dunkles Farbschema.
- Zweisprachige Dokumente (DE/FR/IT/EN) für den Zahlteil und die Texte.

## 11. Veröffentlichung

Die Schritte sind im [README](./README.md) beschrieben. Kurzfassung: Cloudflare-Konto anlegen → `wrangler login` → `npm run db:create` (ID in `wrangler.jsonc` eintragen) → `npm run db:migrate:remote` → Secrets setzen → `npm run deploy`. Danach läuft Keleo unter `https://keleo.<konto>.workers.dev`; eine eigene Domain kann im Dashboard verbunden werden.

## 12. Offene Entscheidungen

1. **QR-IBAN**: Hast du schon eine QR-IBAN von deiner Bank, oder sollen Rechnungen vorerst mit der normalen IBAN und RF-Referenz erstellt werden?
2. **Mehrwertsteuer**: Bist du MWST-pflichtig (Umsatz über CHF 100'000)? Standardmässig ist die MwSt ausgeschaltet.
3. **E-Mail-Versand**: Soll der Versand direkt aus Keleo erfolgen (Resend-Konto und eigene Domain nötig) oder reicht PDF-Download und Versand aus dem Mailprogramm?
4. **Domain**: Eigene Domain (z. B. `rechnungen.deinefirma.ch`) oder die kostenlose `workers.dev`-Adresse?
5. **Logo** auf den Dokumenten gewünscht (Phase 2)?
6. **Ablage**: Keleo liegt jetzt als Ordner `keleo/` in diesem Repository. Soll es ein eigenes Repository werden (empfohlen, sobald es produktiv läuft)?

## 13. Quellen

- Koleo Hilfe: koleo.ch/help (Rechnungen erstellen, Offerten erstellen, Zahlungserinnerungen & Mahnungen, Kunden erfassen, QR-Rechnung, Konto & Abonnement)
- Cloudflare D1 Pricing und Limits: developers.cloudflare.com/d1/platform/pricing, developers.cloudflare.com/d1/platform/limits
- Cloudflare Workers Static Assets: developers.cloudflare.com/workers/static-assets
- SIX Implementation Guidelines QR-bill v2.3 und Factsheet zur Übergangsfrist (strukturierte Adressen ab 21.11.2025): six-group.com (Banking Services → QR-bill)
- Resend: resend.com (Free-Plan 3'000 E-Mails/Monat)
