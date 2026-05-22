# Design-Direction — SADA Bedachung (Privatkunden-Auftritt)

Diese Entscheidungen sind die Basis für Tailwind-Tokens, Storyblok-Asset-Library und KI-Bildprompts. Sie sind verhandelbar bis du das OK gibst — danach werden sie eingefroren und durchgängig angewandt.

---

## 1. Markenpositionierung (für Designton)

**Was SADA ist:** Schweizer Traditions-Dachdecker mit 117 Jahren Geschichte, eingebettet in den Burkhalter-Konzern, ZH-flächendeckend, 24/7 erreichbar, Multi-Material-Kompetenz (Steildach, Flachdach, Metalldach, Spenglerei, Solar, Begrünung).

**Was die Seite ausstrahlen muss:** Solidität, Handwerk, Zuverlässigkeit über Generationen — **ohne** verstaubt, ohne Konzern-kalt, ohne Stockfoto-Beliebigkeit zu wirken. Der Spagat: traditionsreich + modern-kompetent. Nicht Bauern-Romantik, nicht Tech-Startup.

**Designprinzip in einem Satz:** *Schweizer Präzisions-Handwerk in zeitgemässer, fotogetriebener Bühne.*

---

## 2. Farbpalette

Eigene Palette (Markenfarben sind frei wählbar), branchen-glaubwürdig und ausreichend distinkt von der Burkhalter-Konzern-CI:

| Rolle              | Hex       | Verwendung                                                                 |
|--------------------|-----------|----------------------------------------------------------------------------|
| **Primary Dark**   | `#1B2A35` | Anthrazit-Schiefer. Top-Bar, Footer, Trust-Strip-Hintergrund, H1-Text.     |
| **Primary Mid**    | `#2F4858` | Schiefergrau. Sektion-Trenner, sekundäre Flächen.                          |
| **Accent Warm**    | `#C2410C` | Ziegel-Terrakotta. CTA-Buttons, Sterne, Highlights, USP-Marker.            |
| **Accent Muted**   | `#A8501C` | Gedämpftes Ziegelrot. Hover-States, sekundäre Akzente.                     |
| **Neutral Bone**   | `#F4EFE6` | Heller Sandstein. Sekundäre Sektion-Hintergründe.                          |
| **Neutral Light**  | `#FFFFFF` | Reines Weiss. Primäre Content-Sektionen.                                   |
| **Text Body**      | `#1F2937` | Dunkelgrau. Fliesstext.                                                    |
| **Text Muted**     | `#6B7280` | Mittelgrau. Hilfstexte, Captions.                                          |
| **Success**        | `#15803D` | Grün. Form-Validation, "verfügbar"-Indikator.                              |
| **Border Subtle**  | `#E5E7EB` | Hellgrau. Karten-Outlines, Trennlinien.                                    |

**Kontrast:** Alle Text-auf-Hintergrund-Paare WCAG AA-konform. Accent Warm auf Primary Dark erreicht AAA, daher als CTA-Farbe gesetzt.

**Sektion-Hintergründe alternieren:** Weiss → Primary Dark → Bone → Weiss → Primary Mid → Bone → Weiss → Primary Dark. Niemals zwei helle oder zwei dunkle Sektionen direkt hintereinander.

---

## 3. Typografie

| Rolle           | Font                                    | Gewicht         | Notiz                                                       |
|-----------------|-----------------------------------------|-----------------|-------------------------------------------------------------|
| **Display/H1**  | **Instrument Sans** (Google Fonts)      | 600 / 700       | Charaktervolle Sans mit leicht geometrischer Note.          |
| **H2/H3**       | **Instrument Sans**                     | 600             | Konsistenz mit H1.                                          |
| **Body**        | **Inter**                               | 400 / 500       | Maximale Lesbarkeit.                                        |
| **UI/Labels**   | **Inter**                               | 500 / 600       | Form-Labels, Buttons, Trust-Bullets.                        |
| **Numbers/Stat**| **Instrument Sans** (Tabular-Nums)      | 700             | Counter, Telefon-Nummer, Stats. `font-variant-numeric: tabular-nums`. |

**Type-Skala (rem-basiert, Major-Third 1.25):**

```
text-xs    0.75rem  / 1rem
text-sm    0.875rem / 1.25rem
text-base  1rem     / 1.625rem
text-lg    1.125rem / 1.75rem
text-xl    1.25rem  / 1.875rem
text-2xl   1.5rem   / 2rem
text-3xl   1.875rem / 2.25rem    -- H3
text-4xl   2.25rem  / 2.5rem     -- H2 mobil
text-5xl   3rem     / 3.25rem    -- H2 desktop / H1 mobil
text-6xl   3.75rem  / 4rem       -- H1 desktop
text-7xl   4.5rem   / 4.75rem    -- Hero-H1 desktop (optional)
```

**Loading:** Selfhost beide Fonts via `@fontsource/inter` und `@fontsource/instrument-sans`, `font-display: swap`, Subset auf `latin` + `latin-ext`.

---

## 4. Layout-Prinzipien

- **Sektion-Padding:** `py-20 md:py-28 lg:py-32`. Grosszügig, niemals eng.
- **Container:** `max-w-7xl` (1280px) als Default, `max-w-3xl` (768px) für Lese-Sektionen (Über uns, FAQ).
- **Grid-Basis:** 12 Spalten, Gap `gap-8 lg:gap-12`.
- **Asymmetrie an drei Stellen verankert:** Hero (60/40), Über-uns (40/60 Bild/Text), Final-CTA (volles Bild mit Text-Overlay links).
- **Border-Radius:** `rounded-xl` (12px) für Karten, `rounded-2xl` (16px) für Container-Boxen, `rounded-full` für Buttons (Pill-Style).
- **Shadows:** Subtil. `shadow-sm` als Default, `shadow-lg` nur für gehobene Karten (Calculator-Box, Pricing-Box, Review-Cards im Hover-State).

---

## 5. Komponenten-Stile

### Buttons

```
Primary CTA:   bg-[#C2410C] text-white  hover:bg-[#A8501C]  rounded-full  px-7 py-4  font-medium
Secondary:     border border-[#1B2A35] text-[#1B2A35]  hover:bg-[#1B2A35] hover:text-white  rounded-full  px-7 py-4
Ghost (Top-Bar): text-white hover:bg-white/10  px-5 py-2.5
```

Buttons haben **immer** ein Icon rechts (Pfeil/Telefon/WhatsApp) + Helper-Text darunter (max. 8 Wörter, was-passiert-Erklärung).

### Cards

- Bone-Hintergrund auf weissem Section-BG, weisser Hintergrund auf Bone-BG.
- Border: `border border-[#E5E7EB]`.
- Hover: `-translate-y-1 shadow-lg` über 200ms.

### Form-Inputs

- Top-positionierte Labels (`text-sm font-medium mb-1.5`).
- Inputs: `h-12 px-4 rounded-lg border border-[#E5E7EB] focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20`.
- Inline-Validation onBlur, Error-Text in `#B91C1C`, Success-Tick in `#15803D`.

### Trust-Strip

Dunkler Hintergrund (`#1B2A35`), helle Schrift, kleine Trenn-Punkte zwischen Trust-Items. Höhe ca. 72px Desktop / 96px Mobile (gestapelt).

---

## 6. Bildsprache (für Higgsfield-Generierung)

**Stil-Anker (für alle Bildprompts identisch zu verwenden):**

- Photorealistic, kein 3D-Render-Look, kein Stockfoto-Sterilität.
- Tageslicht oder goldene Stunde, niemals harte Mittagssonne.
- Wahre Schweizer Architektur-Kontexte: EFH/MFH der Nachkriegszeit bis modern, Sichtbeton-Akzente, klassische Walmdächer mit Ziegeln oder Flachdächer mit Begrünung. **Keine US-amerikanischen Holzhäuser. Keine Kalifornischen Villen. Keine deutschen Fachwerkromantik-Klischees.**
- Echte Handwerker-Detail-Shots (Hände am Ziegel, Schweissnaht auf Dachbahn, Spenglerwerkzeug an Metallfalz) statt Posing-Foto.
- Farbtemperatur leicht warm, leichte Filmkörnung, dezenter Vignetten-Effekt — vermeidet KI-Sterilität.
- Aspect Ratios: 16:9 (Hero, Final-CTA, Section-Trenner), 4:3 (Vorher-Nachher-Karten, Referenzen), 1:1 (Review-Avatare, Service-Icons-Karten), 9:16 nur falls Reels-Use-Case.

**Kunden-Foto-Regel:** Kein einziges generiertes Foto darf eine real existierende Person darstellen sollen. Reviews nutzen *neutrale Vornamen + Nachnamen-Initial* (z.B. "Reto K., Wallisellen"), Foto wirkt alltäglich-Schweizerisch (kein US-Stockmodel), aber nicht so spezifisch, dass es "diese eine Person" wirkt.

**Inhaber-/Team-Foto-Regel:** **Niemals KI-generieren.** Platzhalter-Box mit Hinweis "Echtes Foto von [Name] hier einsetzen". Tommaso Cascione (Bereichsleiter Bedachung/Spenglerei) ist real und benötigt ein echtes Foto.

---

## 7. Animation-Inventar

Library: **`motion`** (`motion/react` für Astro Islands, framework-agnostic), Fallback `@motionone/dom` für vanilla Sektionen.

| Trigger                      | Effekt                                                                       | Dauer       |
|------------------------------|------------------------------------------------------------------------------|-------------|
| Page Load (Hero)             | H1-Wörter staggered `translate-y(20px → 0) opacity(0→1)`, Stagger 60ms       | 0-700ms     |
| Page Load (Hero Sub)         | wie oben, 200ms Delay                                                        | 200-800ms   |
| Page Load (Calculator)       | `translate-x(40px → 0) opacity(0→1)`                                         | 400-900ms   |
| Scroll-Reveal (alle Sek.)    | `translate-y(20px → 0) opacity(0→1)`, IntersectionObserver 25% threshold     | 500ms       |
| Stagger Children (Karten)    | 100ms zwischen Karten                                                        | je 400ms    |
| Card Hover                   | `-translate-y(4px) shadow-lg`                                                | 200ms       |
| Button Hover                 | `scale-105` + Background-Color-Transition                                    | 150ms       |
| Vorher-Nachher-Drag          | Position der Trennlinie folgt direkt dem Pointer, kein Easing               | live        |
| FAQ-Accordion                | `max-height` + `opacity` Transition                                          | 250ms       |
| Calculator Step-Transition   | `translate-x(20px → 0) opacity(0→1)` vorwärts, gespiegelt rückwärts          | 250ms       |
| Sticky-Mobile-Bar Hide       | Bei Input-Fokus `translate-y(100%)`                                          | 200ms       |

**`prefers-reduced-motion`:** Alle Bewegungen ausser kritischer (z.B. Vorher-Nachher-Drag, Step-Transition) deaktivieren — diese werden auf instant umgeschaltet.

---

## 8. Iconographie

**Quelle:** `lucide` (clean, line-based, einheitlich). Strokewidth durchgängig `1.5`. Grösse je nach Kontext:
- Top-Bar: 18px
- Trust-Bullets: 16px
- Service-Karten: 32px
- Final-CTA Trust-Icons: 24px

**Niemals:** Emoji als Icon. Niemals farbige Material-Icons. Niemals Mixed-Stroke-Width.

---

## 9. Anti-Slop-Regeln (verbindlich, werden im Code-Review geprüft)

- Kein "ß" (Schweizer Hochdeutsch — strikt).
- Keine Ausrufezeichen ausser im 24h-Notdienst-Kontext ("Notdienst — wir sind in 60 Min vor Ort.").
- Keine Emoji-Bullets ✓ ✅ 🔥 — typografische Marker (·, —) oder Lucide-Icons.
- Keine Adjektive ohne Belegzahl. "schnell" → "in 24h", "erfahren" → "seit 1907", "professionell" → "Meisterbetrieb seit 1907".
- Keine Floskeln: "Wir freuen uns auf Sie", "Lassen Sie uns gemeinsam", "Herzlich willkommen", "Auf einen Blick".
- "Sie" : "Wir" mindestens 3:1 zugunsten Sie. Wird zu Implementationsende automatisiert geprüft.
- Hauptkeyword (Stadt + Leistung) muss in H1 stehen. Quality-Score-Pflicht.

---

## 10. Performance-Budgets

- **LCP** < 2.0s auf 4G Mobile (Hero-Bild preloaded mit `fetchpriority="high"`, AVIF + WebP, < 180kB).
- **INP** < 150ms.
- **CLS** < 0.05.
- **Initial JS** < 60kB (Hydration nur für Calculator, Vorher-Nachher-Slider, FAQ-Accordion, Sticky-Bar).
- **Fonts**: zwei Familien, Subset latin+latin-ext, gepreloaded.
- **Analytics**: Plausible (kein Cookie-Banner-CLS, kein GA-Bloat).
