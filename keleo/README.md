# Keleo

Kleines Rechnungs- und Offertenprogramm für Schweizer Einzelfirmen und KMU – angelehnt an den Aufbau von koleo.ch, aber selbst gehostet auf Vercel mit einer Postgres-Datenbank bei Supabase, ohne monatliche Gebühren im Normalbetrieb.

- Kunden mit Adressen, Kontaktdaten, **freien Bemerkungen** und einem **Notiz-Journal**
- **Offerten** erstellen, senden, annehmen lassen und per Klick in eine Rechnung umwandeln
- **Rechnungen** mit Positionen, Rabatt, MwSt (optional), Rappenrundung, Zahlungen, Teilzahlungen, Zahlungserinnerung / 1. / 2. Mahnung
- PDF mit **Schweizer QR-Rechnung** (Zahlteil + Empfangsschein nach SIX-Richtlinien v2.3, QR-IBAN mit QR-Referenz oder normale IBAN mit Creditor Reference)
- **Übersicht** mit offenen und überfälligen Beträgen, offenen Offerten und einer «Zu erledigen»-Liste
- **Aufgaben** (Pendenzen) mit Fälligkeit, optional einem Kunden zugeordnet
- E-Mail-Versand der PDFs über Resend (optional)
- Einzelbenutzer-Login mit Passwort

Der ausführliche Plan (Architektur, Datenmodell, Informationen zu Vercel und Supabase, Phasen) steht in [PLAN.md](./PLAN.md).

## Technik

| Teil | Technologie |
|---|---|
| Laufzeit | Vercel Functions (Node.js 22, Fluid Compute, Region Frankfurt) |
| Datenbank | Postgres bei Supabase (Free-Plan), lokal PGlite (Postgres als WebAssembly, ohne Installation) |
| Web-Framework | Hono mit serverseitigem JSX-Rendering |
| PDF | pdf-lib + qrcode (reines JavaScript) |
| Statische Dateien | `public/` wird von Vercel direkt ausgeliefert |
| Sprache | TypeScript |

Kein Frontend-Build nötig: Vercel erkennt Hono automatisch, CSS und JS liegen fertig in `public/`.

## Lokal starten

Voraussetzung: Node.js 22 oder neuer.

```bash
cd keleo
npm install
cp .env.example .env     # Passwort und Session-Secret für lokal
npm run dev              # http://localhost:8787
```

Ohne `DATABASE_URL` legt Keleo beim ersten Start automatisch eine lokale Postgres-Datenbank (PGlite) im Ordner `.data/` an und führt die Migrationen aus. Anmelden mit dem Passwort aus `.env` (Standard `keleo`), dann unter **Einstellungen** Firma, Adresse und IBAN erfassen.

```bash
npm test          # Unit- und Datenbanktests (QR-Rechnung, Beträge, SQL gegen PGlite)
npm run typecheck # TypeScript
```

## Auf Vercel veröffentlichen

Keleo läuft als Vercel-Projekt `keleo`, das mit diesem Repository verbunden ist (Root-Verzeichnis `keleo`). Die Datenbank liegt bei Supabase im Schema `keleo`; die Tabellen werden beim ersten Start automatisch angelegt (Migrationen in `src/db/migrations.ts`).

Umgebungsvariablen des Vercel-Projekts (*Settings → Environment Variables*):

| Variable | Bedeutung |
|---|---|
| `DATABASE_URL` | Verbindung zu Postgres, z. B. `postgresql://keleo_app.<ref>:<passwort>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres` (Supabase Transaction-Pooler) |
| `APP_PASSWORD` | Anmeldepasswort |
| `SESSION_SECRET` | lange zufällige Zeichenkette für das Sitzungs-Cookie |
| `APP_NAME` | optional, Name in der Oberfläche |
| `RESEND_API_KEY`, `MAIL_FROM` | optional, E-Mail-Versand über Resend |

Veröffentlichen: Push auf den Produktions-Branch des Vercel-Projekts, oder manuell über das Vercel-Dashboard (*Deployments → Redeploy*) bzw. mit `npx vercel --prod` im Ordner `keleo`.

### Datenbank bei Supabase einrichten (einmalig)

1. Projekt anlegen (Region Frankfurt). Keleo nutzt ein eigenes Schema `keleo` und eine eigene Datenbankrolle, damit die Tabellen nicht über die öffentliche Supabase-Daten-API erreichbar sind.
2. Im SQL-Editor ausführen (Passwort ersetzen):
   ```sql
   CREATE ROLE keleo_app LOGIN PASSWORD '<passwort>';
   CREATE SCHEMA keleo AUTHORIZATION keleo_app;
   ```
3. `DATABASE_URL` mit dem Transaction-Pooler (Port 6543, Benutzer `keleo_app.<projekt-ref>`) in Vercel eintragen und neu veröffentlichen. Beim ersten Aufruf legt Keleo die Tabellen an.

### Optional: E-Mail-Versand

Für den Versand direkt aus Keleo wird [Resend](https://resend.com) verwendet (kostenloser Plan: 3'000 E-Mails pro Monat, eigene Domain muss verifiziert werden): `RESEND_API_KEY` und `MAIL_FROM` (z. B. `Muster GmbH <rechnung@muster.ch>`) als Umgebungsvariablen setzen. Ohne diese Variablen lassen sich die PDFs herunterladen und mit dem eigenen Mailprogramm versenden; die Rechnung wird dann manuell «Als gesendet markiert».

### Sicherung

Supabase sichert Free-Projekte nicht automatisch. Empfehlung: regelmässig im Supabase-Dashboard (*Database → Backups*) oder mit `pg_dump` sichern; eine Export-Funktion in Keleo ist für Phase 2 vorgesehen.

## Projektstruktur

```
keleo/
├── public/                CSS, JS, Favicon (werden von Vercel direkt ausgeliefert)
├── src/
│   ├── index.ts           Einstieg für Vercel (exportiert die Hono-App)
│   ├── dev.ts             lokaler Node-Server mit PGlite
│   ├── web.tsx            Hono-App: Login, Middleware, Routen-Montage
│   ├── config.ts          Konfiguration aus Umgebungsvariablen
│   ├── auth.ts            Passwort-Login und signiertes Session-Cookie
│   ├── db.ts              Datenzugriff (Kunden, Dokumente, Zahlungen, Aufgaben, Dashboard)
│   ├── db/
│   │   ├── sql.ts         Treiber: postgres.js (Produktion) und PGlite (lokal/Tests)
│   │   ├── migrations.ts  Schema-Migrationen (laufen automatisch beim Start)
│   │   └── index.ts       Verbindungsaufbau
│   ├── lib/
│   │   ├── qrbill.ts      Swiss QR Code: Payload, IBAN/QR-IBAN, QRR/SCOR-Referenzen
│   │   ├── pdf.ts         PDF-Erzeugung inkl. Zahlteil/Empfangsschein
│   │   ├── totals.ts      Summen, Rabatt, MwSt, Rappenrundung
│   │   ├── money.ts       Beträge in Rappen, Formatierung
│   │   ├── email.ts       Resend-Anbindung
│   │   └── status.ts      Anzeigestatus (offen, überfällig, teilbezahlt …)
│   ├── routes/            HTTP-Routen pro Bereich
│   └── views/             Seiten als JSX-Komponenten
├── test/                  Vitest (Fachlogik und Datenbank gegen PGlite)
├── vercel.json            Framework «hono», Region Frankfurt
└── PLAN.md                Plan und Hintergrund
```

## Hinweise zur QR-Rechnung

- Seit dem 21. November 2025 sind im Swiss QR Code nur noch **strukturierte Adressen** erlaubt (Strasse und Hausnummer getrennt). Keleo erfasst Adressen deshalb immer getrennt.
- **QR-IBAN** (von der Bank beantragen): Rechnungen erhalten eine 27-stellige QR-Referenz, Zahlungen lassen sich automatisch zuordnen.
- **Normale IBAN**: Rechnungen erhalten eine Creditor Reference nach ISO 11649 (RF…).
- Unter *Einstellungen → Test-Zahlteil* lässt sich ein Beispiel-PDF erzeugen und mit der Banking-App scannen.
- Für die Produktion empfiehlt sich eine einmalige Prüfung einer echten Rechnung mit dem Validierungsdienst der SIX (validation.iso-payments.ch) oder direkt mit der eigenen Bank.
