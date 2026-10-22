# Design brief: 10-day sun forecast (Sunly app)

> Paste this into the **"Sunly Design System"** project in Claude Design.
> Use that project's existing components and tokens (SunChanceRing, Card, Button,
> sun-chance color scale, Manrope, radii). Do not invent a new visual style.

---

## Context

Sunly is a mobile app (React Native, portrait, light theme) for people planning a trip
to the Canary Islands, the Balearics or the Spanish coast. **The core of the app is the
historical "Sun chance" gauge**: the chance of a sunny day in a given month, calculated
from 10 years of weather station data. That gauge must stay the dominant element of the
result screen.

We are adding a **short-term forecast (10 days)** as a *secondary* feature. It must
support the historical gauge, not compete with it.

Current result screen, top to bottom:

1. Header: location name + "My location"
2. **LIVE card**: current temperature, wind, gusts, humidity, weather icon + label, green "LIVE" pill (top right)
3. **Sun chance gauge** (big amber ring, historical, month picker) — the hero
4. Wind / Rain tiles (small rings)
5. Best weeks to visit (gold / silver / bronze cards)

## What to design (3 things)

### 1. Entry point inside the LIVE card

The 10-day forecast should **not** be a separate section on the screen anymore. Instead,
add a small, quiet entry point **inside the LIVE card**, e.g. a text button or chip at the
bottom of the card: "10-day forecast ›" with a small calendar or sun icon.

- It must not make the LIVE card much taller (the card should stay compact).
- It must look secondary: lower visual weight than the temperature and much lower than
  the Sun chance gauge below.
- Do not move or restyle the "LIVE" pill.
- Optional: a tiny teaser next to the label, e.g. "Tomorrow 82%" — show it as an option, not a must.

### 2. 10-day forecast panel (opens after tapping the entry point)

A **bottom sheet** sliding up from the bottom (about 60–75% screen height), with a handle,
a title "Sun chance · 10 days" and a close action.

Inside: 10 day items. Each day has:

- day label ("Today", "Mon", "Tue"…)
- weather icon (sunny / partly sunny / cloudy / rainy)
- **sun chance %** (0–100) — the main number
- max / min temperature

Please propose the layout that works best in a sheet. A **vertical list** (one row per
day, with a small horizontal sun-chance bar or mini ring) is probably clearer than the
current horizontal strip of small tiles, but show your recommendation.
Use the system's **sun-chance color scale** (amber = sunny, blue/grey = cloudy) consistently.

Footer note in small muted text: "% = chance of sunshine on that day, based on the weather forecast".

### 3. Day detail (opens after tapping one day)

Either a second bottom sheet or the same sheet switching to a detail view (with a "back"
action). Propose which works better.

Content:

- Header: full weekday + date ("Thursday · 22.10") + weather icon
- **Big SunChanceRing** with the day's sun chance % — same ring style as the main gauge,
  but clearly smaller than the main historical gauge on the result screen
- Info rows (icon in a soft circle + label + value):
  - Sunshine: "10.3 h of 11.3 h daylight" (may be missing for some data sources — design must work without this row)
  - Temperature: "24° / 18°"
  - Rain: "20% · 1.2 mm" (mm only when > 0)
  - Wind: "18 km/h · gusts 35 km/h"
  - UV index: "7 · High" (levels: Low, Moderate, High, Very high, Extreme)
  - Sunrise / sunset: "07:58 / 19:12"
- Close button

## Constraints

- **The historical Sun chance gauge stays the hero of the screen.** Nothing in this
  feature should be bigger, brighter or more prominent than it.
- Light theme. Existing app colors: primary blue `#0052D4`, amber `#F59E0B` (sun),
  rain blue `#1385FF`, hot red `#E5484D`, live green `#22C55E`, text `#191C1E` / `#43474E` / `#73777F`,
  background gradient `#E4EEFB → #CFDFF4`, glass cards (white 55% + blur), card radius 24.
- Font: Manrope.
- 4 languages (EN, PL, ES, DE) — German labels are long, leave room.
- Phone width ~360–412 px.

## Deliverables

- Mockups of: LIVE card with the entry point, forecast sheet, day detail.
- Show sample data for a sunny day (85%), a mixed day (50%) and a rainy day (15%).
- Short notes on sizes, spacing and which design-system components you used.
