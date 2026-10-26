# Keleo

Kleines Rechnungs- und Offertenprogramm für Schweizer Einzelfirmen und KMU – angelehnt an den Aufbau von koleo.ch, aber selbst gehostet auf Cloudflare (Workers + D1-Datenbank), ohne monatliche Gebühren im Normalbetrieb.

- Kunden mit Adressen, Kontaktdaten, **freien Bemerkungen** und einem **Notiz-Journal**
- **Offerten** erstellen, senden, annehmen lassen und per Klick in eine Rechnung umwandeln
- **Rechnungen** mit Positionen, Rabatt, MwSt (optional), Rappenrundung, Zahlungen, Teilzahlungen, Zahlungserinnerung / 1. / 2. Mahnung
- PDF mit **Schweizer QR-Rechnung** (Zahlteil + Empfangsschein nach SIX-Richtlinien v2.3, QR-IBAN mit QR-Referenz oder normale IBAN mit Creditor Reference)
- **Übersicht** mit offenen und überfälligen Beträgen, offenen Offerten und einer «Zu erledigen»-Liste
- **Aufgaben** (Pendenzen) mit Fälligkeit, optional einem Kunden zugeordnet
- E-Mail-Versand der PDFs über Resend (optional)
- Einzelbenutzer-Login mit Passwort

Der ausführliche Plan (Architektur, Datenmodell, Cloudflare-Informationen, Phasen) steht in [PLAN.md](./PLAN.md).

## Technik

| Teil | Technologie |
|---|---|
| Laufzeit | Cloudflare Workers (serverlos, weltweit verteilt) |
| Datenbank | Cloudflare D1 (serverloses SQLite) |
| Web-Framework | Hono mit serverseitigem JSX-Rendering |
| PDF | pdf-lib + qrcode (reines JavaScript, läuft im Worker) |
| Statische Dateien | Workers Static Assets (`public/`) |
| Sprache | TypeScript |

Kein Frontend-Build nötig: `wrangler` bündelt den Worker, CSS und JS liegen fertig in `public/`.

## Lokal starten

Voraussetzung: Node.js 20 oder neuer.

```bash
cd keleo
npm install
cp .dev.vars.example .dev.vars        # Passwort und Session-Secret für lokal
npm run db:migrate:local              # lokale SQLite-Datenbank anlegen
npm run dev                           # http://localhost:8787
```

Anmelden mit dem Passwort aus `.dev.vars` (Standard `keleo`), dann unter **Einstellungen** Firma, Adresse und IBAN erfassen.

```bash
npm test          # Unit-Tests (QR-Rechnung, Beträge)
npm run typecheck # TypeScript
```

## Auf Cloudflare veröffentlichen

Keleo braucht ein kostenloses Cloudflare-Konto (<https://dash.cloudflare.com>). Die Einrichtung übernimmt das Skript `npm run cloud:setup`: Es legt die D1-Datenbank an, trägt deren ID in `wrangler.jsonc` ein, führt die Migrationen aus, veröffentlicht den Worker und setzt fehlende Secrets (Anmeldepasswort, Session-Secret). Es darf beliebig oft laufen.

### Zugang zu Cloudflare: Login oder API-Token

- **Am eigenen Computer** reicht `npx wrangler login` (öffnet den Browser).
- **Ohne Browser** (Claude-Cloud-Umgebung, GitHub Actions) braucht es ein API-Token:
  1. <https://dash.cloudflare.com/profile/api-tokens> → *Create Token* → Vorlage **Edit Cloudflare Workers**.
  2. Unter *Permissions* prüfen, dass **Account → D1 → Edit** enthalten ist (sonst hinzufügen), Token erstellen und kopieren.
  3. Die **Account-ID** steht im Dashboard unter *Workers & Pages* in der rechten Spalte.
  4. Beide Werte als Umgebungsvariablen `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` hinterlegen (nie in Dateien im Git).

### Weg A: aus der Claude-Cloud-Umgebung

1. In den Umgebungs-Einstellungen (Menü der Cloud-Umgebung in der Titelleiste → *Edit*) unter *Network access* die Domains `api.cloudflare.com` und `workers.cloudflare.com` erlauben (Paketmanager erlaubt lassen).
2. Dort unter *Network secrets* bzw. *Environment variables* `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` eintragen, optional `KELEO_APP_PASSWORD` (sonst wird ein Passwort erzeugt und einmalig angezeigt).
3. Neue Sitzung starten und Claude bitten, `npm run cloud:setup` im Ordner `keleo` auszuführen.

### Weg B: automatisch über GitHub Actions

Der Workflow `.github/workflows/deploy-keleo.yml` veröffentlicht bei jeder Änderung in `keleo/` auf dem Hauptbranch (oder manuell über *Actions → Deploy Keleo → Run workflow*).

1. In GitHub unter *Settings → Secrets and variables → Actions* anlegen: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `KELEO_APP_PASSWORD`; optional `KELEO_RESEND_API_KEY`, `KELEO_MAIL_FROM`.
2. Workflow starten. Die Adresse der App steht am Ende des Protokolls.
3. Die vom Skript geänderte `wrangler.jsonc` (Datenbank-ID) einmal ins Repository übernehmen, damit alle weiteren Läufe dieselbe Datenbank verwenden. Das Skript findet die Datenbank aber auch ohne diesen Schritt über ihren Namen.

### Weg C: am eigenen Computer

```bash
cd keleo
npm install
npx wrangler login
npm run cloud:setup
```

Danach ist Keleo unter `https://keleo.<dein-account>.workers.dev` erreichbar. Eine eigene Domain lässt sich im Cloudflare-Dashboard unter *Workers & Pages → keleo → Settings → Domains & Routes* hinzufügen.

### Nach der Einrichtung

- Passwort ändern: `npx wrangler secret put APP_PASSWORD`
- Datenbank-Sicherung: `npx wrangler d1 export keleo --remote --output backup.sql`
- Neue Version veröffentlichen: `npm run deploy` (oder erneut `npm run cloud:setup`)

### Optional: E-Mail-Versand

Für den Versand direkt aus Keleo wird [Resend](https://resend.com) verwendet (kostenloser Plan: 3'000 E-Mails pro Monat, eigene Domain muss verifiziert werden):

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM        # z. B. "Muster GmbH <rechnung@muster.ch>"
```

Ohne diese Secrets lassen sich die PDFs herunterladen und mit dem eigenen Mailprogramm versenden; die Rechnung wird dann manuell «Als gesendet markiert».

### Optional: zusätzlicher Schutz mit Cloudflare Access

Für mehr Sicherheit kann die App zusätzlich hinter **Cloudflare Access** (Zero Trust, bis 50 Benutzer kostenlos) gestellt werden: Dann ist vor dem Keleo-Login noch eine Anmeldung per E-Mail-Code oder Google-Konto nötig.

## Projektstruktur

```
keleo/
├── migrations/            SQL-Migrationen für D1 (0001_init.sql)
├── scripts/cloud-setup.mjs Einrichtung und Veröffentlichung auf Cloudflare in einem Schritt
├── public/                CSS, JS, Favicon (werden direkt vom Edge ausgeliefert)
├── src/
│   ├── index.tsx          Einstieg: Hono-App, Login, Routen-Montage
│   ├── auth.ts            Passwort-Login und signiertes Session-Cookie
│   ├── db.ts              Datenzugriff (Kunden, Dokumente, Zahlungen, Aufgaben, Dashboard)
│   ├── env.ts             Typen für Bindings und Secrets
│   ├── lib/
│   │   ├── qrbill.ts      Swiss QR Code: Payload, IBAN/QR-IBAN, QRR/SCOR-Referenzen
│   │   ├── pdf.ts         PDF-Erzeugung inkl. Zahlteil/Empfangsschein
│   │   ├── totals.ts      Summen, Rabatt, MwSt, Rappenrundung
│   │   ├── money.ts       Beträge in Rappen, Formatierung
│   │   ├── email.ts       Resend-Anbindung
│   │   └── status.ts      Anzeigestatus (offen, überfällig, teilbezahlt …)
│   ├── routes/            HTTP-Routen pro Bereich
│   └── views/             Seiten als JSX-Komponenten
├── test/                  Vitest-Unit-Tests
├── wrangler.jsonc         Cloudflare-Konfiguration (Worker, D1, Assets)
└── PLAN.md                Plan und Hintergrund
```

## Hinweise zur QR-Rechnung

- Seit dem 21. November 2025 sind im Swiss QR Code nur noch **strukturierte Adressen** erlaubt (Strasse und Hausnummer getrennt). Keleo erfasst Adressen deshalb immer getrennt.
- **QR-IBAN** (von der Bank beantragen): Rechnungen erhalten eine 27-stellige QR-Referenz, Zahlungen lassen sich automatisch zuordnen.
- **Normale IBAN**: Rechnungen erhalten eine Creditor Reference nach ISO 11649 (RF…).
- Unter *Einstellungen → Test-Zahlteil* lässt sich ein Beispiel-PDF erzeugen und mit der Banking-App scannen.
- Für die Produktion empfiehlt sich eine einmalige Prüfung einer echten Rechnung mit dem Validierungsdienst der SIX (validation.iso-payments.ch) oder direkt mit der eigenen Bank.
