# Canary Weather — App Description for Redesign

> Paste this brief into your design tool (v0, Lovable, Figma AI, etc.).
> It describes WHAT the app does and shows. The color palette is intentionally
> left open — choose a fresh palette as part of the redesign.

---

## 1. One-liner

**Canary Weather** is a mobile app that helps travellers decide **when and where to go on the Canary Islands**, by combining live weather with **10 years of historical weather statistics** for each location.

## 2. Purpose & differentiator

Unlike a normal forecast app, Canary Weather answers a planning question: *"What's the realistic chance of good weather at this place, in this month?"* It does this using historical data from 19 official AEMET weather stations, plus live conditions and Saharan-dust ("Calima") detection.

## 3. Target audience

People (mostly based outside the islands) planning a trip to the Canary Islands. They want to pick the sunniest island/town and the best time to visit. Secondary use: checking live conditions during the trip.

## 4. Platform & format

- Mobile app (Android now, iOS planned), **portrait orientation**.
- Built with React Native / Expo.
- **4 languages**: English, Polish, Spanish, German.
- Offline-friendly: shows cached data with an OFFLINE/CACHED badge, pull-to-refresh.

---

## 5. Screen-by-screen breakdown

### A. Onboarding (first launch)
- Welcome message: "Find the sun in the Canaries."
- Short explanation: we analyze historical data so you can check your chance of blue skies.
- Single "Get Started" button.
- Optional location-permission prompt ("Weather Near You" — Use Location / Enter Manually).

### B. Search screen (home)
- App title "Canary Weather" + subtitle.
- Large search input ("Search for a place").
- "My location" shortcut.
- **Popular destinations** list (resorts/towns).
- Results show place name + distance "from nearest weather station".
- Footer trust line: "Data from 10 years • 19 AEMET stations".

### C. Result screen (the heart of the app)
This is the most important screen. Scrollable, sectioned:

1. **"Now" section — live weather card**
   - Big current temperature, weather condition (icon + label), humidity, wind, gusts.
   - LIVE / OFFLINE / CACHED status badge with a small live dot.
   - Animated weather effects in the background.

2. **Alert cards (conditional)** — appear only when relevant:
   - Calima (Saharan dust) alert → opens an info modal.
   - High waves (coastal) alert, Strong wind alert, Snowfall alert (AEMET Meteoalerta).
   - "Rain nearby" / "Strong wind nearby" discrepancy notices.

3. **Chance of sun** — a circular **gauge** showing sun probability % for the selected month, with a confidence level (High/Medium/Low) and "Based on historical data".

4. **Month selector** — horizontal chips (JAN…DEC) to switch the month.

5. **Historical stats cards** ("Last 10 years"): Avg. Max temp, Avg. Min temp, Avg. Wind, Rainy Days.

6. **Summary** — a friendly sentence, e.g. "In July, Tenerife enjoys sunshine 85% of the time…".

7. **Best time to visit** — "Top 3 sunniest weeks of the year" cards.

8. Two tappable cards leading to detail screens: **Wind** and **Rain**.

### D. Wind details screen
- Current wind speed + **Beaufort scale** indicator (Calm → Hurricane).
- **Trade Wind Stability** ("Passat Guarantee"): Very Stable / Moderately Stable / Variable.
- Stats: avg speed, speed range, days >20 km/h.
- **Island ranking**: average wind across all islands for the month, with ranked positions (1st / 2nd / 3rd).
- Historical context note.

### E. Rain details screen
- Rainfall characteristics: avg precipitation, rainy days in month, days without rain.
- Monthly comparison (MAX/MIN).
- **North vs South** explainer (trade winds, rain-shadow effect).
- **Island ranking**: average precipitation across all islands for the month.
- Historical context note.

---

## 6. Recurring UI components

- Cards for all content blocks.
- Circular sun-chance gauge.
- Alert cards (with distinct severity levels: low / medium / high).
- Weather icons (sun, cloud, rain, snow, fog, thunderstorm, windy, Calima…).
- Month-selector chips.
- Rank badges for island rankings (1st / 2nd / 3rd).
- Info modals (Calima, Sun Chance explainer).
- Language switcher.

---

## 7. Current visual style (reference — palette is open)

- **Aesthetic:** glassmorphism — frosted translucent cards with a blur effect over a gradient background.
- **Layout:** content organized into cards with generous spacing; data-rich but easy to scan.
- **Cards:** translucent panels with a subtle 1px border and a blur effect behind them.
- **Per-island theming:** each island can have its own distinct accent/background theme to give a sense of place.

> **Color palette is intentionally not specified** — the redesign should introduce a fresh palette. Backgrounds, accents, weather states (sun/rain/temperature), alert severity levels, and per-island themes are all open to a new color direction.

## 8. Redesign goals (from user testing)

- Testers said the app is **very easy and intuitive to use** — keep that simplicity.
- Main request: **improve and polish the visual design / appearance** — this is the focus of the redesign.
- Keep it data-rich but visually cleaner and more modern.

## 9. Must-keep constraints

- Trust/attribution: data is from **AEMET** (Spanish met service). Keep a small "Data: AEMET" line and the disclaimer "This app is not affiliated with AEMET or any government entity."
- The "10 years / 19 stations" credibility messaging.
- All text must work in 4 languages (some labels get long in German/Polish — design with flexible text length).
