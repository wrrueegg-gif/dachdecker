# Audit der bestehenden Webseite — sada.ch

**Methodik-Hinweis:** Die Live-Seite sada.ch blockt automatisierte Zugriffe (HTTP 403 / Bot-Schutz). Der Audit basiert auf Google-Suchergebnis-Snippets, indexierten Unterseiten-Titeln und der ablesbaren Sitemap. Visuelle Detail-Aspekte (Above-the-Fold-Komposition, Farbtreue, Spacing, Typo) sind damit nicht gesichert — wo gemutmasst werden muss, ist es so markiert.

---

## 1. Hero-5-Sekunden-Test — vermutet schwach

Aus der indexierten Meta-Description: *"SADA AG — Ihr Partner für Gebäudetechnik und Gebäudehülle für Neubauten, Umbauten und Sanierungen."*

Das ist eine **Corporate-Aussage**, kein Conversion-Hero. Ein Privatkunde aus Zürich, der bei Google "Dachdecker Zürich" sucht, bekommt hier weder Stadt-Bezug noch konkrete Leistung noch Trust-Signal in der Sub-Sekunde. Das Wort "Dachdecker" fehlt sogar im Title-Tag der Startseite. Was, für wen, nächster Schritt — alle drei unklar.

## 2. Match-the-Message — Fehlanzeige

Hauptkeyword *"Dachdecker Zürich"* und *"Bedachung Zürich"* tauchen im Homepage-Headline-Bereich nicht prominent auf. SADA rankt nur über die Unterseite `/dienstleistungen/bedachung`. Wer auf Google Ads klickt mit Suchwort "Flachdach sanieren Zürich" und auf der Startseite landet, sieht zuerst "Gebäudetechnik und Gebäudehülle" — Quality Score leidet, CPC ist höher als nötig.

## 3. Conversion-Pfad — Konzern-Pfad, kein Verkaufspfad

- Primärer sichtbarer CTA scheint die **24h-Notdienstnummer +41 44 297 97 97** zu sein — stark für Notfälle, schwach für Sanierungs-Leads.
- **Anfrageformular** existiert (`/dienstleistungen/kundendienst/anfrageformular`), ist aber zwei Klicks tief.
- Multi-Step-Angebotsrechner: nicht vorhanden.
- Sticky-Mobile-Bar mit Anruf/WhatsApp/Angebot: nicht erkennbar.
- WhatsApp-Kanal: nicht erkennbar.

## 4. Formular-Zustand — vermutet Single-Step

Indizien deuten auf ein klassisches Single-Page-Kontaktformular (Name/Anliegen/Nachricht) hinter `/anfrageformular`. Kein progressives Disclosure, keine Schritt-für-Schritt-Logik, kein Service-Picker. Das ist branchen-typisch für CH-Mittelstand und gleichzeitig der grösste ungehobene Conversion-Hebel.

## 5. Trust-Signals — vorhanden, aber nicht verkauft

SADA hat **objektiv starke Trust-Signale**:
- **117 Jahre** (gegr. 1907 als Dachdecker-Genossenschaft)
- **~160 Mitarbeitende**
- Teil der **Burkhalter Gruppe** (~4'600 MA Konzern)
- **24/7-Notdienst** mit eigener Nummer
- Tommaso Cascione als namentlich nennbarer Bereichsleiter Bedachung/Spenglerei
- ~900 Lernende konzernweit (Ausbildungs-Signal)

Diese Signale liegen **verteilt über Unterseiten** statt im Hero gebündelt. Ein Besucher, der nicht klickt, sieht keines davon. Klassischer "buried lead".

## 6. Copy-Diagnose — vermutet zu firmen-zentriert

Die Meta-Descriptions und URL-Slugs deuten auf Wir-Sprache ("Unsere Organisation", "Unsere Talentschmiede", "Unser Ziel"). Schätzung Sie/Wir-Verhältnis: **~1:3 zugunsten Wir** (Korrektur-Richtung: muss umgedreht auf 3:1 zugunsten Sie). Konkrete Zahlen vorhanden, aber nicht im Hero. Adjektive vermutlich dominant.

## 7. Top-3-Conversion-Lecks (geordnet nach Impact)

1. **Hero ist Corporate-Statement, nicht Verkaufs-Hero.** Stadt, Leistung, Differenzierung, Trust und CTA gehören in den ersten Sichtbereich. → grösster Hebel, schätzungsweise +30-60% Lead-Volumen bei gleichem Traffic.
2. **Kein Multi-Step-Angebotsrechner.** Privatkunden, die "Flachdach sanieren" oder "Dach neu decken" suchen, brauchen einen niedrigschwelligen Einstieg vor dem grossen Schritt "Termin vereinbaren". → schätzungsweise 2-3× Conversion-Lift gegenüber Single-Step-Formular (Formstack/HubSpot-Daten).
3. **Trust-Signale sind nicht im Hero und nicht im Trust-Strip gebündelt.** "Seit 1907 · 160 Mitarbeitende · Teil der Burkhalter Gruppe · 24h-Notdienst" ist eine der stärkstmöglichen Trust-Sequenzen am ZH-Dach-Markt und wird verschenkt.

## Zusätzliche Beobachtungen (sekundär)

- **B2B/B2C-Verwischung:** Die aktuelle Seite spricht gleichzeitig Architekten, Verwaltungen und Privatkunden an. Der neue Auftritt fokussiert laut Briefing auf **Privatkunden** — das schärft den Hero radikal und schliesst die anderen Zielgruppen nicht aus, dient ihnen über Referenzen-Seiten.
- **Vorher-Nachher-Galerie:** Auf der bestehenden Seite gibt es `/objekte-bedachung/` mit Referenzen, aber kein erkennbares Vorher-Nachher-Format mit Drag-Slider. Das ist bei einem visuellen Gewerk wie Dach der grösste Visual-Trust-Hebel.
- **Schweizer Hochdeutsch:** Korrekt umgesetzt (ss statt ß, "Offerte" überwiegt im Index). Beibehalten.
- **24h-Notdienst-Nummer +41 44 297 97 97 ist ein USP**, der auf der Startseite klein behandelt wird und auf einer eigenen Landingpage stärker monetarisierbar wäre.
