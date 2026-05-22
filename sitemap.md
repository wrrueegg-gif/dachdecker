# Sitemap & Seitenstruktur — SADA Bedachung

Multi-Page-Auftritt mit klarer Conversion-Hierarchie. Jede Seite hat **einen** primären Conversion-Pfad (Multi-Step-Angebotsrechner oder Anruf) + Trust-Signale + relevante Cross-Links zu Schwester-Leistungen.

---

## Top-Level-Routen

```
/                              Startseite (Conversion-Hub)
/bedachung                     Bedachung Hauptseite
/bedachung/flachdach           Sub: Flachdach
/bedachung/steildach           Sub: Steildach
/bedachung/metalldach          Sub: Metalldach (Prefa, Doppelfalz, Sinus/Trapez)
/bedachung/dachsanierung       Sub: Dachsanierung (eigene SEO-Landingpage, hochvolumiges Keyword)
/spenglerei                    Spenglerei Hauptseite
/spenglerei/dachrinnen         Sub: Dachrinnen & Fallrohre
/spenglerei/blitzschutz        Sub: Blitzschutz
/spenglerei/fassadenverkleidung Sub: Fassadenverkleidung
/solar                         Solaranlagen / PV auf dem Dach
/dachbegruenung                Dachbegrünung / Gründächer
/wartung                       Wartung & Dachunterhalt
/notdienst                     24h-Notdienst (eigene Lead-Magnet-Page)
/referenzen                    Referenzen (filterbar nach Gewerk + Region)
/referenzen/[slug]             Einzelnes Referenz-Projekt
/ueber-uns                     Über uns / Geschichte seit 1907
/team                          Ansprechpersonen / Team-Vorstellung
/jobs                          Karriere (Übersicht)
/jobs/[slug]                   Stellen-Detail
/aktuell                       News / Blog (Übersicht)
/aktuell/[slug]                Einzelner Artikel
/kontakt                       Kontakt & Anfahrt
/offerte                       Multi-Step-Angebotsrechner als eigene Page (für direkte Ad-Links)
/danke                         Form-Success-Page
/impressum                     Impressum (Inhaber füllt)
/datenschutz                   Datenschutz (Inhaber füllt)
/agb                           AGB (optional, Inhaber füllt)
```

---

## Seiten-Sektionen pro Routentyp

### Startseite `/`

Volle Sektionsfolge aus dem Original-Prompt, fokussiert auf "Dachdecker Zürich" als Haupt-Keyword:

1. Top-Bar (global) · Hero · Trust-Strip · Social-Proof-Strip · Vorher-Nachher-Galerie · Leistungen-Übersicht (6 Karten = 6 Service-Seiten) · Prozess · Über uns Teaser · FAQ · Final CTA · Sticky-Mobile-Bar (global) · Footer (global)

### Leistungs-Hauptseiten `/bedachung`, `/spenglerei`, `/solar`, `/dachbegruenung`, `/wartung`

Eigene Conversion-Page pro Gewerk. Match-the-Message für jeweiliges Keyword.

1. Top-Bar · Hero (gewerk-spezifischer H1) · Trust-Strip · Mini-Erklärung "Was ist [Leistung]?" (1 Absatz, SEO-stark) · Leistungs-Detail-Liste · Vorher-Nachher-Galerie (gewerk-gefiltert) · Material-/Technik-Erklärung (3-Karten) · Prozess (3 Schritte, gewerk-spezifisch) · Referenz-Teaser (3 Karten, gewerk-gefiltert) · FAQ (gewerk-spezifisch) · Final CTA · Sticky-Mobile-Bar · Footer

### Sub-Leistungs-Seiten `/bedachung/flachdach`, etc.

Schmaler, SEO-fokussiert. Sind die eigentlichen Google-Ads-Landingpages für Long-Tail-Keywords.

1. Top-Bar · Hero (Long-Tail-H1, z.B. "Flachdach sanieren in Zürich") · Trust-Strip · Was-ist-X-Erklärung · 3-4 Materialvarianten als Karten · Preisspannen-Indikator (wenn vorhanden) · Vorher-Nachher (3-5 Projekte) · FAQ · Final CTA · Sticky-Bar · Footer

### `/notdienst` (Lead-Magnet-Page)

Komplett anderer Conversion-Pfad: Anruf zuerst, Form als Backup.

1. Top-Bar · Hero mit riesigem `tel:`-Button und "60 Minuten Reaktionszeit"-Versprechen · Trust-Strip · "Was ist ein Notfall?" (3-4 Karten: Sturmschaden, Wasserschaden, undichtes Dach, Hagelschaden) · Prozess (60 Min Anruf → vor Ort → Soforthilfe → schriftliche Offerte für Reparatur) · 3 Notfall-Kunden-Stimmen · `tel:`-CTA + Form als Backup · Sticky-Bar · Footer

### `/referenzen`

1. Top-Bar · Hero mit Stat-Counter ("800+ Projekte seit 2000" o.ä., real-validiert) · Filter (Gewerk / Region / Jahr) · Grid mit 12-24 Projekt-Karten (Pagination oder Infinite Scroll) · Final CTA · Sticky-Bar · Footer

### `/referenzen/[slug]` (Projekt-Detail)

1. Top-Bar · Hero-Bild (Nachher-Aufnahme) · Projekt-Meta (Standort, Scope, Dauer, Material) · Vorher-Nachher-Slider · Story (3-5 Absätze) · Kundenstimme · 3-Bild-Detail-Galerie · "Ähnliche Projekte" (3 Karten) · Final CTA · Sticky-Bar · Footer

### `/ueber-uns`

1. Top-Bar · Hero mit Founding-Year-Hero ("Seit 1907 für Zürcher Dächer.") · Geschichte-Timeline (1907 → 1960er → 2000er → Burkhalter-Übernahme → heute) · Werte (3-4 Karten) · Burkhalter-Konzern-Erklärung · Team-Teaser-Link · Final CTA · Sticky-Bar · Footer

### `/team`

1. Top-Bar · Hero · Team-Grid (Bereichsleiter Bedachung prominent: Tommaso Cascione, weitere Geschäftsleitung, Projektleiter) — alle mit ECHTEN Fotos · Was-uns-auszeichnet (3 Karten) · Final CTA · Sticky-Bar · Footer

### `/jobs`

1. Top-Bar · Hero "Werde Teil von 160 Profis bei SADA" · Werte als Arbeitgeber (3-4 Karten) · Offene Stellen (Liste, dynamisch) · Lehre-Sektion (~900 Lernende konzernweit) · Bewerbungs-Prozess · Final CTA "Initiativbewerbung" · Sticky-Bar · Footer

### `/kontakt`

1. Top-Bar · Hero · Kontakt-Block (Adresse Vega-Strasse 3, 8152 Glattpark / Telefon / WhatsApp / Mail / Öffnungszeiten) · Eingebettete Karte (OpenStreetMap, kein Google-Maps wegen Datenschutz) · ÖV-Anfahrt · Auto-Anfahrt · Multi-Step-Calculator als sekundärer Pfad · Sticky-Bar · Footer

### `/offerte`

Multi-Step-Angebotsrechner als eigene Page für direkte Ad-Links. Identische Logik wie Hero-Calculator, nur full-page.

### `/danke`

Form-Success. Restliche Sektionen reduziert auf:
1. Top-Bar · Danke-Block ("Was passiert jetzt?" in 3 Schritten) · Telefon + WhatsApp-Direkt-Buttons · Mini-Referenzen-Teaser · Footer.

---

## Globale Komponenten (auf jeder Seite)

- **Top-Bar** (sticky, Logo · Mo-Fr-Erreichbarkeit · Telefon prominent · "Offerte berechnen"-Button)
- **Sticky-Mobile-Bar** (Anrufen · WhatsApp · Offerte) — versteckt sich bei Form-Fokus
- **Footer** (Adresse · Leistungen-Links · Service-Links · Rechtliches · Social · Burkhalter-Hinweis)

---

## Navigation (Header-Menu)

Desktop:

```
Logo SADA    | Bedachung ▾ | Spenglerei ▾ | Solar | Wartung | Notdienst | Referenzen | Über uns ▾ | Kontakt | [+41 44 297 97 97] [Offerte berechnen]
```

Dropdowns:
- **Bedachung ▾:** Flachdach · Steildach · Metalldach · Dachsanierung
- **Spenglerei ▾:** Dachrinnen & Fallrohre · Blitzschutz · Fassadenverkleidung
- **Über uns ▾:** Geschichte · Team · Jobs · Aktuell

Mobile: Hamburger mit gleicher Struktur, akkordeon-artig ausklappbar.

---

## SEO-Architektur

- `LocalBusiness`-Schema im Root-Layout (Adresse, Telefon, Öffnungszeiten, Geo-Koordinaten Glattpark)
- `Service`-Schema pro Leistungs-Seite
- `FAQPage`-Schema auf jeder Seite mit FAQ-Sektion
- `BreadcrumbList`-Schema auf Sub-Seiten
- `AggregateRating` im Root + auf Hauptseiten (sobald echte Bewertungs-Quelle definiert ist)
- XML-Sitemap automatisch via `@astrojs/sitemap`
- robots.txt mit Sitemap-Verweis
- Hreflang nicht nötig (nur de-CH)

---

## Routing-Pattern Astro

- `/src/pages/index.astro` → fetcht Storyblok-Story "home"
- `/src/pages/[...slug].astro` → catch-all für alle anderen Pages, fetcht entsprechende Storyblok-Story via slug
- `/src/pages/referenzen/[slug].astro` → Detail-Pattern
- `/src/pages/jobs/[slug].astro` → Detail-Pattern
- `/src/pages/aktuell/[slug].astro` → Detail-Pattern

Alle Storyblok-Stories rendern `body: bloks[]` via `<StoryblokComponent>`, sodass Redakteure jede Page in Storyblok komplett selbst zusammenbauen können.
