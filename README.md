# SADA Bedachung — Conversion-Website

Astro 4 + Tailwind 3, statisches Multi-Page-Setup mit Multi-Step-Angebotsrechner, Vorher-Nachher-Galerie und Branchen-Schwerpunkt Dachdecker/Spenglerei für die Schweiz (Kanton Zürich).

---

## Stack

- **Astro 4** mit View Transitions, Sitemap-Integration
- **Tailwind 3** mit eigenem Design-Token-Set (siehe `tailwind.config.mjs`)
- **Instrument Sans + Inter Variable** als Schriften (selbst gehostet via Fontsource)
- **Lucide-Icons** als Inline-SVG (kein Runtime-Overhead)
- **Keine SPA, keine Hydration ausser Calculator + Vorher-Nachher-Slider** — der Rest ist statisches HTML + minimal JS für Reveal-Animationen

---

## Setup

```bash
npm install
npm run dev
```

Dev-Server: http://localhost:4321

```bash
npm run build      # Produktions-Build nach /dist
npm run preview    # Statische Vorschau des Builds
```

---

## Inhalts-Struktur

Alle Daten sind als typisierte TypeScript-Module unter `src/data/` abgelegt:

| Datei | Was darin steht |
|---|---|
| `src/data/site.ts` | Firmen-Stammdaten (Telefon, Adresse, Öffnungszeiten, Trust-Fakten) |
| `src/data/services.ts` | Die 6 Leistungs-Bereiche mit Slug, Teaser, Features |
| `src/data/reviews.ts` | Kundenstimmen (Erstversion anonymisiert — vor Live durch echte ersetzen) |
| `src/data/projects.ts` | Vorher-Nachher-Projekte für die Galerie |
| `src/data/faq.ts` | 12 FAQ-Einträge mit Frage-Antwort |
| `src/data/images.ts` | Bild-URLs (zentral) — CDN-Links auf Higgsfield-Generationen |

Migration auf Storyblok-CMS später: die Daten-Module sind das 1:1-Abbild der späteren Storyblok-Blocks. Beim Wechsel werden die TypeScript-Imports gegen `useStoryblokApi()`-Aufrufe getauscht — die Astro-Komponenten bleiben unverändert.

---

## Seitenstruktur

- `/` — Conversion-Startseite
- `/bedachung` (+ Sub-Pages `/flachdach`, `/steildach`, `/metalldach`, `/dachsanierung`)
- `/spenglerei`
- `/solar`
- `/dachbegruenung`
- `/wartung`
- `/notdienst` (Lead-Magnet-Page mit Anruf-First-CTA)
- `/referenzen`
- `/ueber-uns`
- `/team`
- `/jobs`
- `/aktuell`
- `/kontakt`
- `/offerte` (Standalone-Calculator für direkte Ad-Links)
- `/danke` (Form-Success)
- `/impressum`, `/datenschutz`, `/agb` (Inhaber-Stubs)

---

## Bilder

Aktueller Stand: Hero, Vorher-Nachher-Paar 1, CTA-Hintergrund sind via **Higgsfield `soul_location`** generiert und liegen als Remote-URLs in `src/data/images.ts`.

Geplant (alle Prompts in `image-prompts.md`):
- 4 weitere Vorher-Nachher-Bilder (Projekt 2 + 3)
- 3 Service-Detail-Shots
- 3 Kunden-Review-Avatare (Higgsfield `soul_cast`)

**Wichtig:** Inhaber-/Team-Fotos werden bewusst nicht KI-generiert (Trust-Risiko). Auf `/team` und `/ueber-uns` sind Platzhalter mit Hinweis — vor Live-Schaltung durch echte Fotos ersetzen.

**Lokale Optimierung:** Vor dem Production-Build:
1. Bilder von Higgsfield-CDN nach `/public/img/` herunterladen
2. Pfade in `src/data/images.ts` von CDN-URLs auf `/img/...` umstellen
3. `npm run build` — Astro optimiert die lokalen Bilder dann via `<Image>`-Komponente

---

## Anpassen

| Was | Wo |
|---|---|
| Telefonnummer / Adresse | `src/data/site.ts` |
| Leistungen / Service-Beschreibungen | `src/data/services.ts` + `src/pages/<service>.astro` |
| FAQ | `src/data/faq.ts` |
| Reviews | `src/data/reviews.ts` |
| Vorher-Nachher-Projekte | `src/data/projects.ts` (Bilder in `/public/img/projects/`) |
| Farbpalette | `tailwind.config.mjs` (Color-Tokens) |
| Schriften | `src/styles/global.css` (Fontsource-Imports) |
| Hero-Headline | `src/components/sections/Hero.astro` (Default-Props) oder als Prop auf `index.astro` |
| Schema-Markup | `src/layouts/Layout.astro` |

---

## Form-Backend

Der Multi-Step-Calculator postet aktuell an `/` (Form-Submission-Endpoint). Vor Live-Schaltung:

- **Empfehlung:** Formspree, Web3Forms, oder Netlify Forms — alle drei funktionieren mit statischem Astro ohne Backend.
- Alternativ ein Astro-Endpoint unter `src/pages/api/quote.ts` einbauen, der an SADA-CRM oder Mail weiterleitet.
- Spam-Schutz: Honeypot-Feld einbauen oder Cloudflare Turnstile.

Erfolgs-Page: `/danke`.

---

## SEO

- `LocalBusiness`-Schema im Layout (Adresse, Telefon, Öffnungszeiten, Geo)
- `FAQPage`-Schema in jeder FAQ-Sektion (mehrfach pro Site OK)
- `@astrojs/sitemap` generiert automatisch eine Sitemap unter `/sitemap-index.xml`
- `robots.txt` vorhanden
- View Transitions für sanfte Navigation (Google bewertet das positiv)
- Lighthouse-Ziele (siehe `design-direction.md` Abschnitt 10): LCP < 2.0s, INP < 150ms, CLS < 0.05

---

## Deployment

Funktioniert auf jedem statischen Host:

- **Vercel:** `vercel deploy` — automatische Erkennung Astro
- **Netlify:** Build-Command `npm run build`, Publish-Dir `dist`
- **Cloudflare Pages:** identisch
- **Eigener Server:** `dist/` per FTP oder rsync auf Webserver kopieren

Domain auf `https://www.sada.ch` setzen, `site` in `astro.config.mjs` ist bereits darauf konfiguriert.

---

## Vor Live-Schaltung — Checkliste

- [ ] Inhaber-/Team-Fotos einsetzen (Platzhalter ersetzen)
- [ ] Echte Kunden-Reviews einsetzen (anonymisierte Erstversion ersetzen)
- [ ] Impressum, Datenschutzerklärung, AGB ausfüllen
- [ ] Form-Backend einrichten und testen
- [ ] Plausible oder Umami für Analytics einrichten
- [ ] OG-Default-Image `/og-default.jpg` ergänzen (1200×630)
- [ ] Favicon auf Firmenmarke anpassen (`/favicon.svg`)
- [ ] Domain konfigurieren und HTTPS einrichten
- [ ] Sitemap an Google Search Console übermitteln
- [ ] Google Ads UTM-Tracking auf Conversion-CTAs ergänzen
- [ ] Bilder lokal optimieren (siehe Abschnitt Bilder)
