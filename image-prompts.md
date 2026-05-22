# Higgsfield Image-Prompts — SADA Bedachung

**Modell:** `soul_location` (Higgsfield) für Architektur/Dach/Landschaft. `soul_cast` für Kunden-Review-Avatare. Niemals für Inhaber/Team — Platzhalter mit Hinweis "Echtes Foto erforderlich".

**Globale Stil-Anker (in JEDEN Prompt einfügen oder als implizit verwenden):**

> *photorealistic, editorial architectural photography, 35mm lens look, soft golden-hour or overcast natural light, shallow depth of field, subtle film grain, slight cinematic vignette, Swiss residential context (canton of Zurich), no US-style architecture, no text, no logos, no signage, no watermark*

**Negative-Direktiven (mental anzuwenden):**

> *no cartoon, no 3D render, no overly polished CGI, no stock-photo sterility, no harsh midday sun, no obvious AI artifacts on roof tiles, no American suburb cliches*

---

## INVENTAR — 14 Bilder total

| ID    | Sektion                  | Aspect | Modell           | Status |
|-------|--------------------------|--------|------------------|--------|
| HERO  | Sektion 1 Startseite     | 21:9   | soul_location    | Test gestartet |
| BA-01 | Vorher Projekt 1         | 4:3    | soul_location    | tbd |
| BA-02 | Nachher Projekt 1        | 4:3    | soul_location    | tbd |
| BA-03 | Vorher Projekt 2         | 4:3    | soul_location    | tbd |
| BA-04 | Nachher Projekt 2        | 4:3    | soul_location    | tbd |
| BA-05 | Vorher Projekt 3         | 4:3    | soul_location    | tbd |
| BA-06 | Nachher Projekt 3        | 4:3    | soul_location    | tbd |
| REV-1 | Kunden-Avatar 1          | 1:1    | soul_cast        | tbd |
| REV-2 | Kunden-Avatar 2          | 1:1    | soul_cast        | tbd |
| REV-3 | Kunden-Avatar 3          | 1:1    | soul_cast        | tbd |
| SVC-1 | Bedachung Service-Karte  | 4:3    | soul_location    | tbd |
| SVC-2 | Spenglerei Service-Karte | 4:3    | soul_location    | tbd |
| SVC-3 | Solar Service-Karte      | 4:3    | soul_location    | tbd |
| CTA   | Final-CTA Hintergrund    | 21:9   | soul_location    | tbd |

---

## HERO — `/public/img/hero-dach.webp`

**Verwendung:** Startseite Sektion 1, vollflächiger Hero-Hintergrund mit dunklem Overlay auf der linken Text-Hälfte.

```
Photorealistic exterior shot of a freshly tiled pitched roof on a Swiss
single-family house in the canton of Zurich. Anthracite-grey concrete roof
tiles in immaculate condition, precise sheet-metal ridge cap, clean copper
gutter, suburban Swiss residential setting with mature trees in the
background, soft warm golden-hour side-light, shallow depth of field,
subtle film grain, slight cinematic vignette, no people, no text, no logos,
35mm lens look, editorial architectural photography.
```

**Aspect Ratio:** 21:9 (auch verwendbar als 16:9 wenn 21:9 mobil zu schmal wirkt)
**Stil:** photorealistic / atmospheric

---

## VORHER-NACHHER-PAARE (3 Projekte)

**Regel:** Identischer Bildwinkel, identische Tageszeit, identische Lichtstimmung im Paar. Nur der Dach-Zustand ändert sich. Sonst wirkt der Slider unglaubwürdig.

### Projekt 1 — Steildach-Sanierung Wallisellen

**BA-01 (Vorher):**
```
Photorealistic exterior of a 1970s Swiss single-family house in Wallisellen
near Zurich. Old worn-out concrete roof tiles with moss patches, faded
colour, slightly sagging ridge, weathered gutter with rust spots, overcast
diffuse daylight, dull mood. Same camera position and same architecture as
the matching after image. No people, no text, no logos. 35mm lens look,
editorial architectural photography, subtle film grain.
```

**BA-02 (Nachher):**
```
Photorealistic exterior of the SAME 1970s Swiss single-family house in
Wallisellen as the before image, identical camera position, identical
framing, identical overcast diffuse daylight. Now fully renovated:
brand-new anthracite-grey concrete roof tiles, crisp sheet-metal ridge cap,
new copper gutter with clean downpipe, immaculate appearance. No people,
no text, no logos. 35mm lens look, editorial architectural photography,
subtle film grain.
```

Aspect Ratio: 4:3 · Modell: soul_location

### Projekt 2 — Flachdach-Sanierung Glattpark MFH

**BA-03 (Vorher):**
```
Photorealistic top-down-angled exterior of a 1990s Swiss multi-family
apartment building's flat roof in Glattpark Opfikon, viewed from a slight
elevation (drone-style 40-degree angle). Cracked old bitumen membrane,
visible water-pooling marks, weathered gravel ballast, peeling roof edge.
Overcast soft daylight, muted colours. No people, no text, no logos.
Editorial architectural photography, 35mm lens look.
```

**BA-04 (Nachher):**
```
Photorealistic top-down-angled exterior of the SAME 1990s Swiss
multi-family apartment building's flat roof in Glattpark as the before
image, identical camera angle and framing, identical overcast daylight.
Now fully renovated: new dark bitumen sealing membrane with extensive
green sedum roof planting in fresh growth, clean stainless-steel roof
edge profile, neat lightning protection rod. No people, no text, no
logos. Editorial architectural photography.
```

Aspect Ratio: 4:3 · Modell: soul_location

### Projekt 3 — Metalldach-Erneuerung Bauernhaus

**BA-05 (Vorher):**
```
Photorealistic exterior of an old Swiss farmhouse roof near Zurich,
weathered rusty corrugated sheet-metal roof with patches and visible
seam-rust, ageing barn-style architecture, soft overcast daylight, no
people, no text, no logos. Same camera position and framing as the
matching after image. Editorial architectural photography, 35mm lens look.
```

**BA-06 (Nachher):**
```
Photorealistic exterior of the SAME Swiss farmhouse near Zurich as the
before image, identical camera position, identical framing, identical
overcast daylight. Now fully renovated: brand-new standing-seam zinc
sheet-metal roof in matte anthracite, precise crimp seams, sharp roof
edge, restored sheet-metal flashing around chimney. No people, no text,
no logos. Editorial architectural photography, 35mm lens look.
```

Aspect Ratio: 4:3 · Modell: soul_location

---

## KUNDEN-AVATARE (3 Stück)

**Wichtige Regel:** Nicht so, dass die Person "diese eine reale Person" wirkt. Avatar-Charakter, neutral genug für ein anonymisiertes Testimonial. Schweizer Alltagsstil.

### REV-1 — Reto K., Wallisellen, ~50

```
Photorealistic candid portrait of a friendly middle-aged Swiss man in his
late forties to early fifties, short greying hair, casual outdoor clothing
(plain blue button-down shirt), warm natural daylight, standing relaxed in
front of a generic suburban Swiss residential setting (no specific
landmarks). Neutral approachable expression, slight smile, looking
naturally at the camera. Editorial documentary style, not a stock photo
look, subtle film grain, 50mm lens. No text, no logos.
```

Aspect Ratio: 1:1 · Modell: soul_cast

### REV-2 — Andrea M., Zürich Oerlikon, ~40

```
Photorealistic candid portrait of a friendly Swiss woman around forty
years old, shoulder-length brown hair, casual modern outdoor clothing
(plain knit cardigan in neutral tone), warm natural daylight, standing
relaxed in front of a generic Swiss residential courtyard background.
Neutral approachable expression, slight smile, looking naturally at the
camera. Editorial documentary style, not a stock photo look, subtle
film grain, 50mm lens. No text, no logos.
```

Aspect Ratio: 1:1 · Modell: soul_cast

### REV-3 — Markus F., Bassersdorf, ~60

```
Photorealistic candid portrait of a friendly Swiss man around sixty
years old, short grey hair, weather-tanned face, casual outdoor clothing
(plain dark fleece jacket), overcast diffuse daylight, standing relaxed
in front of a generic Swiss village street background (no specific
landmarks). Neutral approachable expression, calm look, looking
naturally at the camera. Editorial documentary style, not a stock photo
look, subtle film grain, 50mm lens. No text, no logos.
```

Aspect Ratio: 1:1 · Modell: soul_cast

---

## SERVICE-KARTEN (3 Stück, alle Detail-Shots)

### SVC-1 — Bedachung

```
Photorealistic close-up detail shot of skilled hands laying new anthracite
concrete roof tiles on a Swiss pitched roof, precise overlap, sheet-metal
ridge cap in the background, soft warm afternoon light, shallow depth of
field, no faces visible, only forearms and tiles in focus. Subtle film
grain, 50mm macro lens look, editorial craft photography. No text, no
logos.
```

Aspect Ratio: 4:3 · Modell: soul_location

### SVC-2 — Spenglerei

```
Photorealistic close-up detail shot of skilled hands working a crimp seam
on a standing-seam zinc sheet-metal roof, traditional spengler hand tool
in use, precise metalwork, soft overcast natural light, shallow depth of
field, no faces visible. Subtle film grain, 50mm macro lens look,
editorial craft photography, sense of generations-old swiss craftsmanship.
No text, no logos.
```

Aspect Ratio: 4:3 · Modell: soul_location

### SVC-3 — Solar

```
Photorealistic angled exterior of a modern Swiss residential roof in
Zurich with newly installed black photovoltaic solar panels in a clean
geometric grid, integrated flush with anthracite roof tiles, blue sky
with soft clouds, warm side-light, suburban setting. Subtle film grain,
35mm lens look, editorial architectural photography. No text, no logos,
no brand names visible on panels.
```

Aspect Ratio: 4:3 · Modell: soul_location

---

## FINAL-CTA-HINTERGRUND — `/public/img/cta-dach.webp`

**Verwendung:** Sektion 9 Hintergrund mit dunklem Overlay, andere Stimmung als Hero (Dämmerung statt goldene Stunde).

```
Photorealistic wide exterior of a fully renovated Swiss single-family
house at dusk in the canton of Zurich, warm interior window light glowing
softly, immaculate dark anthracite pitched roof, copper gutter detail
catching the last daylight, suburban setting with mature trees, calm
ambient atmosphere, blue hour sky transition. Subtle film grain, 35mm
lens look, editorial architectural photography. No people, no text, no
logos.
```

Aspect Ratio: 21:9 · Modell: soul_location

---

## Generierungs-Reihenfolge & Budget

1. **HERO zuerst** als Stilanker. Wenn Stil sitzt: alle anderen Prompts mit gleichen Anker-Begriffen.
2. **3 Vorher-Nachher-Paare** als Block (6 Bilder) — wichtigste visuelle Sektion.
3. **3 Kunden-Avatare** als Block.
4. **3 Service-Karten** als Block.
5. **CTA-Hintergrund** als Abschluss.

**Wenn ein Generierungs-Output qualitativ daneben liegt:** sofort 1 Re-Run mit konkretisiertem Prompt, niemals stillschweigend ein schwächeres Bild verwenden. Maximal 2 Retries pro ID, dann eskalieren.

---

## Echte Fotos — NICHT generieren

- Tommaso Cascione (Bereichsleiter Bedachung/Spenglerei)
- Geschäftsleitung
- Projektleiter
- Team-Fotos auf `/team`
- Office-Aussenaufnahme Vega-Strasse 3, 8152 Glattpark

→ Platzhalter-Boxen mit Text "Echtes Foto von [Person/Objekt] hier einsetzen" + Bildmasse + Style-Guidance.
