# Implementation Notes - Canary Weather

Ten plik zawiera notatki z implementacji i decyzji technicznych. Sprawdzaj go na początku każdej sesji Claude Code.

---

## 2026-04-15: Google Play - Poprawki zgodności z polityką (Misleading Claims)

### Problem
Aplikacja została odrzucona przez Google Play (13 kwietnia 2026) z powodu naruszenia polityki Misleading Claims:
- Brak linku do źródła danych rządowych (AEMET)
- Brak disclaimera o niezależnym statusie (nie jesteśmy AEMET)

### Rozwiązanie

**1. Zaktualizowano Full description w Google Play Console:**
- Dodano wyraźny disclaimer na początku (⚠️ emoji)
- Dodano sekcję "📌 DATA SOURCES:" z linkami:
  - AEMET: https://www.aemet.es/
  - WeatherAPI, Open-Meteo (supplementary)
  - WAQI (air quality)

**2. Dodano disclaimer w aplikacji:**
- Nowy footer na `SearchScreen` pod popularnymi destynacjami
- Link klikalny do AEMET (otwiera https://www.aemet.es/)
- Disclaimer w 4 językach

**Pliki:**
- `src/i18n/locales/en.json` - sekcja `footer`
- `src/i18n/locales/pl.json` - sekcja `footer`
- `src/i18n/locales/es.json` - sekcja `footer`
- `src/i18n/locales/de.json` - sekcja `footer`
- `src/screens/SearchScreen.tsx` - komponent footera

**3. Nowa wersja:**
- Version: 1.4.2 (versionCode: 5)
- Build ID: 8127dc12-9189-4b36-a227-47433bc738b9
- AAB: https://expo.dev/artifacts/eas/gX2q79YXZkEDaLbreTuGVF.aab

**4. Release notes (4 języki):**
```xml
<en-GB>
- Added data source attribution and disclaimer
- Compliance with Google Play government information policy
- Minor UI improvements
</en-GB>
```

### Status
- 15.04.2026: Wysłano poprawioną wersję do sprawdzenia Google Play
- Oczekiwany czas review: 1-3 dni robocze
- Po zatwierdzeniu: Test zamknięty → 14 dni testów → Publikacja produkcyjna

---

## 2026-03-23: Fix - Zerowe temperatury w karcie "Ostatnie 10 lat"

### Problem
Dla miejscowości Maspalomas (stacja C689E), w karcie "Ostatnie 10 lat" na ekranie wyników, lata 2021-2025 pokazywały temperatury 0°/0° zamiast rzeczywistych wartości.

### Diagnoza
Sprawdzono dane w Supabase dla stacji C689E:
- 2021-2025: dane istnieją (31 rekordów/miesiąc), ale `tmax` i `tmin` są `null`
- 2016-2020: dane kompletne z temperaturami

Porównanie z innymi stacjami (Las Palmas C649I, Tenerife Sur C447A) wykazało, że mają pełne dane - problem dotyczy tylko stacji C689E. AEMET przestał dostarczać dane temperatur dla tej stacji od 2021.

### Rozwiązanie
Zmodyfikowano funkcję `fetchYearlyData` w `ResultScreen.tsx` - dodano warunek pomijający lata bez danych temperatur:

```typescript
// Skip years without any temperature data (both tmax and tmin are null)
if (validTmax.length === 0 && validTmin.length === 0) continue;
```

**Plik:** `src/screens/ResultScreen.tsx:466`

### Efekt
Zamiast pokazywać mylące "0°/0°", aplikacja teraz pomija lata bez danych temperatur w historii.

### Rozszerzenie: Komunikat o brakujących danych

Dodano informację dla użytkownika o brakujących latach:

1. `fetchYearlyData` zwraca teraz obiekt `{ years, skippedYears }`
2. Dodano state `skippedYears` do śledzenia pominiętych lat
3. W sekcji "Ostatnie 10 lat" wyświetlany jest komunikat gdy `skippedYears.length > 0`
4. Dodano tłumaczenia `result.missingYearsInfo` we wszystkich 4 językach

**Pliki:**
- `src/screens/ResultScreen.tsx` - logika i UI
- `src/i18n/locales/*.json` - tłumaczenia

---

## 2026-03-22: Usprawnienia LiveWeather - fallback temperatury i interpolacja

### Kontekst
Aplikacja pobiera dane pogodowe live z AEMET (pomiary) + WeatherAPI/Open-Meteo (warunki). Brakowało fallbacku dla temperatury gdy AEMET niedostępne lub dane przestarzałe.

### Zadanie 1: Fallback temperatury na Open-Meteo

**Problem:** Gdy dane AEMET są stare (>3h), temperatura może być nieaktualna.

**Rozwiązanie:**
- Rozszerzono `OpenMeteoConditionResult` o pole `temperature`
- `fetchOpenMeteoCondition()` i `fetchWeatherAPICondition()` zwracają teraz temperaturę
- W `fetchLiveWeather()` dodano logikę `useExternalTemperature`:
  - Gdy obserwacja AEMET > 3h (`isVeryStaleObservation`)
  - I zewnętrzne źródło ma temperaturę
  - → Używa temperatury z WeatherAPI/Open-Meteo

**Zmiany w pliku:** `src/services/weatherService.ts`
- Linia ~1998: Interfejs `OpenMeteoConditionResult` + pole `temperature`
- Linia ~2008: URL Open-Meteo + `temperature_2m`
- Linia ~2044: Return z `temperature` w `fetchOpenMeteoCondition()`
- Linia ~2200: Return z `temperature` w `fetchWeatherAPICondition()`
- Linie ~2287-2355: Logika fallbacku w `fetchLiveWeather()`

**Progi czasowe:**
- 2h (`isStaleObservation`) - fallback wiatru (istniejąca logika)
- 3h (`isVeryStaleObservation`) - fallback temperatury (nowa logika)

---

### Zadanie 2: Interpolacja danych live między stacjami

**Problem:** Dla lokalizacji oddalonych od stacji pogodowych dane z pojedynczej stacji mogą być niereprezentywne.

**Rozwiązanie:**
- Nowa funkcja `interpolateLiveWeather(lat, lon)` (linia ~1379)
- Próg interpolacji: 10km (`LIVE_INTERPOLATION_THRESHOLD_KM`)
- Algorytm: Inverse Distance Weighting (IDW) z kwadratem odległości

**Logika:**
1. Znajdź 3 najbliższe stacje (bez wysokogórskich)
2. Jeśli najbliższa < 10km → użyj tylko jej
3. W przeciwnym razie:
   - Pobierz dane ze wszystkich stacji równolegle
   - Oblicz wagi: `1 / distance^2`
   - Interpoluj: temperatura, wilgotność, wiatr, porywy, opady
   - Warunki pogodowe: z najbliższej stacji

**Eksportowane typy:**
- `InterpolatedLiveWeatherResult` - zawiera dane + listę stacji z wagami

**Wzorce do naśladowania:**
- `calculateInterpolatedMonthlyStats()` - ta sama logika wag
- `calculateDistanceWeights()` - współdzielona funkcja wag

---

## Konwencje projektu

### Struktura fallbacków w fetchLiveWeather()
1. AEMET (pomiary) - źródło podstawowe
2. WeatherAPI (warunki) - źródło uzupełniające
3. Open-Meteo (warunki) - fallback dla WeatherAPI
4. Cache - fallback gdy API niedostępne
5. Mock data - tylko w __DEV__

### Progi czasowe
- 15 min - rate limit cache (in-memory)
- 2h - stale observation (wind fallback)
- 3h - very stale observation (temperature fallback)
- 24h - AsyncStorage cache expiry

### Progi odległościowe
- 5km - `SINGLE_STATION_THRESHOLD_KM` (monthly stats)
- 10km - `LIVE_INTERPOLATION_THRESHOLD_KM` (live weather)

---

## 2026-03-22: Testy dla interpolateLiveWeather

**Plik:** `src/services/__tests__/weatherService.test.ts`

**Dodane testy (9 przypadków):**

1. **threshold behavior**
   - `should use single station when closest station is within 10km`
   - `should find nearest stations correctly`

2. **interpolation logic**
   - `should handle API failures gracefully (DEV fallback to mock data)`
   - `should handle partial station failures gracefully`

3. **result structure**
   - `should return correct InterpolatedLiveWeatherResult structure`
   - `should have weights that sum to 1 for multi-station interpolation`

4. **edge cases**
   - `should handle timeout gracefully and return mock data in DEV mode`
   - `should exclude high altitude stations by default`
   - `should return stations for valid Canary Islands coordinates`

**Uruchamianie testów:**
```bash
npx jest src/services/__tests__/weatherService.test.ts --testNamePattern="interpolateLiveWeather" --forceExit
```

**Uwagi:**
- W trybie DEV aplikacja używa mock data jako fallback (nie zwraca null)
- Testy weryfikują graceful degradation zamiast strict null checking

---

## 2026-03-22: Integracja interpolateLiveWeather w UI

**Plik:** `src/screens/ResultScreen.tsx`

**Zmiany:**
1. Import `interpolateLiveWeather`, `InterpolatedLiveWeatherResult`, `findNearestStations`
2. Nowy state: `isInterpolated`, `interpolationStations`
3. Logika w `loadLiveWeather`:
   - Sprawdza odległość do najbliższej stacji
   - Jeśli >= 10km → używa `interpolateLiveWeather()`
   - W przeciwnym razie → standardowe `fetchLiveWeather()`
4. Logika w `handleRefresh` (pull-to-refresh) - analogiczna
5. Nowy prop w `LiveWeatherCard`: `isInterpolated`, `interpolationStations`
6. Wizualny wskaźnik interpolacji pod kartą pogody

**Tłumaczenia dodane:**
- `result.interpolatedData` w en/pl/es/de.json

**Jak to działa:**
- Użytkownik szuka lokalizacji daleko od stacji (np. > 10km)
- App automatycznie pobiera dane z 2-3 najbliższych stacji
- Interpoluje wartości (temperatura, wilgotność, wiatr)
- Wyświetla info "Uśrednione z: Station1, Station2"

---

## 2026-03-22: Poprawki gramatyczne w polskich tłumaczeniach

### Problem 1: Miejscownik miesięcy
**Błąd:** "Średnia prędkość wiatru w miesiącu Marzec" (mianownik)
**Poprawka:** "Średnia prędkość wiatru w marcu" (miejscownik)

**Rozwiązanie:**
- Wykorzystano istniejącą sekcję `monthsLocative` w pl.json
- Zmodyfikowano kod w ekranach, aby dla języka polskiego używać `t('monthsLocative.${monthKey}')` zamiast `t('months.${monthKey}')`

**Zmienione pliki:**
- `src/i18n/locales/pl.json` - zmieniono "w miesiącu {{month}}" na "w {{month}}"
- `src/screens/WindDetailsScreen.tsx:262-265` - warunkowy miejscownik dla PL
- `src/screens/RainDetailsScreen.tsx:251-254` - warunkowy miejscownik dla PL

**Klucze już obsługujące miejscownik (w kodzie):**
- `result.summaryDetailed` (ResultScreen.tsx:831-833)
- `wind.stabilityDesc_*` (TradeWindStabilityCard.tsx:50-52)
- `wind.island_ranking_title` (WindDetailsScreen.tsx:279-283)
- `rain.island_ranking_title` (RainDetailsScreen.tsx:271-273)

---

### Problem 2: Pluralizacja "dni/dzień"
**Błąd:** "deszcz pada średnio 1 dni w miesiącu"
**Poprawka:** "deszcz pada średnio 1 dzień w miesiącu"

**Rozwiązanie:**
- Dodano klucze pluralizacji w i18next:
  ```json
  "rainDaysText_one": "{{count}} dzień",
  "rainDaysText_few": "{{count}} dni",
  "rainDaysText_many": "{{count}} dni"
  ```
- Użyto `t('result.rainDaysText', { count: X })` zamiast `${X} ${t('result.daysUnit')}`

**Zmienione pliki:**
- `src/i18n/locales/pl.json` - dodano rainDaysText_one/few/many
- `src/i18n/locales/en.json` - dodano rainDaysText_one/other
- `src/i18n/locales/de.json` - dodano rainDaysText_one/other
- `src/i18n/locales/es.json` - dodano rainDaysText_one/other
- `src/screens/ResultScreen.tsx:846-856` - pluralizacja w summaryDetailed
- `src/screens/ResultScreen.tsx:1017` - pluralizacja w karcie "Dni deszczowe"

**Polskie reguły pluralizacji (i18next):**
- `_one`: n == 1 → "dzień"
- `_few`: n % 10 ∈ {2,3,4} && n % 100 ∉ {12,13,14} → "dni"
- `_many`: pozostałe → "dni"

---

## 2026-03-23: Fix - Polska pluralizacja w karcie "Deszcz"

### Problem
Na karcie "Deszcz" na ekranie wyników wyświetlało się: "Dni deszczowe. 2 days" - mieszanka polskiego i angielskiego.

### Diagnoza
i18next w wersji 25.x nie używał domyślnie CLDR plural rules dla języka polskiego. Polski wymaga specjalnych form:
- `_one`: 1 (dzień)
- `_few`: 2-4, 22-24, 32-34... (dni)
- `_many`: 0, 5-21, 25-31... (dni)

Bez odpowiedniej konfiguracji, i18next szukał `_other` (angielski fallback) i wyświetlał "days".

### Rozwiązanie
1. **Dodano `compatibilityJSON: 'v4'`** w konfiguracji i18n:
   ```typescript
   i18n.init({
     compatibilityJSON: 'v4', // Enable CLDR plural rules
     // ...
   });
   ```

2. **Dodano `rainDaysText_other`** jako fallback w pl.json:
   ```json
   "rainDaysText_one": "{{count}} dzień",
   "rainDaysText_few": "{{count}} dni",
   "rainDaysText_many": "{{count}} dni",
   "rainDaysText_other": "{{count}} dni"
   ```

**Pliki:**
- `src/i18n/index.ts:58` - konfiguracja compatibilityJSON
- `src/i18n/locales/pl.json:112` - dodano rainDaysText_other

### Efekt
Teraz "Dni deszczowe" poprawnie wyświetla "2 dni" zamiast "2 days".

---

## 2026-03-24: Fix - Fałszywe burze z WeatherAPI

### Problem
Dla miejscowości na Fuerteventurze (i potencjalnie innych wyspach) karta LiveWeather pokazywała "Burza" mimo bezchmurnej nocy. Problem dotyczył wszystkich lokalizacji na wyspie.

### Diagnoza
Logi pokazały:
```
[AEMET] Live data: 19°C, wind 5 km/h, gusts 7 km/h
[WeatherAPI] Condition: Patchy light rain in area with thunder (code 1273)
[Hybrid] AEMET measurements + WeatherAPI condition
```

WeatherAPI zwracał błędny kod 1273 (burza z deszczem), podczas gdy AEMET nie raportował żadnych opadów (`prec = 0`). Aplikacja bezwarunkowo przyjmowała warunki pogodowe z WeatherAPI.

### Rozwiązanie
Dodano walidację krzyżową w funkcji `prioritizeWeatherCondition()`:

```typescript
// VALIDATION: If WeatherAPI says stormy/rainy but AEMET has NO precipitation,
// the WeatherAPI data is likely wrong - override with clear condition
const aemetHasNoPrecip = precipitation === undefined || precipitation === 0;
if (aemetHasNoPrecip && (baseCondition === 'stormy' || baseCondition === 'rainy')) {
  console.log(`[Priority] Correcting false ${baseCondition}: AEMET reports no precipitation`);
  return {
    condition: isNight ? 'clear-night' : 'sunny',
    labelKey: isNight ? 'clearNight' : 'sunny',
  };
}
```

**Plik:** `src/services/weatherService.ts:1864-1875`

### Logika walidacji
1. AEMET dostarcza pomiary z czujników (temperatura, wiatr, opady `prec`)
2. WeatherAPI/Open-Meteo dostarcza warunki pogodowe (satellite/model data)
3. Jeśli WeatherAPI mówi "stormy" lub "rainy", ale AEMET sensor nie wykrywa opadów → dane WeatherAPI są błędne
4. W takim przypadku nadpisz warunek na "sunny" (dzień) lub "clear-night" (noc)

### Efekt
Logi po poprawce:
```
[WeatherAPI] Condition: Patchy light rain in area with thunder (code 1273)
[Hybrid] AEMET measurements + WeatherAPI condition
[Priority] Correcting false stormy: AEMET reports no precipitation
[Priority] Overriding stormy → clear-night (precip=0, gusts=7)
```

Aplikacja teraz poprawnie pokazuje "Bezchmurna noc" zamiast fałszywej burzy.

### Uwagi
- Walidacja opiera się na zaufaniu do czujników AEMET (ground truth)
- WeatherAPI może zwracać błędne dane z powodu niedokładności modeli satelitarnych
- Rozwiązanie działa dla wszystkich lokalizacji, nie tylko Fuerteventury

---

## 2026-03-25: REFACTOR - Uproszczona architektura Live Weather

### Problem
Karta Live Weather ciągle pokazywała błędne dane z powodu skomplikowanej logiki łączącej dane z wielu źródeł:
- AEMET (sensory) + WeatherAPI (warunki) + walidacja krzyżowa + fallbacki

Każda poprawka wprowadzała nowe edge cases. Architektura była zbyt złożona.

### Stara architektura (problematyczna)
```
fetchLiveWeather():
1. Cache check
2. AEMET → pomiary (temp, wiatr, opady)
3. WeatherAPI → warunek (ikona)
4. Merge: AEMET + WeatherAPI
5. Fallback wiatru gdy AEMET stare (>2h)
6. Fallback temp gdy AEMET bardzo stare (>3h)
7. prioritizeWeatherCondition() - walidacja krzyżowa  ← ŹRÓDŁO PROBLEMÓW
8. Cache fallback
```

**9+ punktów decyzyjnych** = chaos i niespójne dane.

### Nowa architektura (uproszczona)
```
fetchLiveWeather():
1. Cache check (15 min)
2. WeatherAPI → WSZYSTKO (temp, wiatr, warunek, humidity)
3. AEMET (opcjonalnie) → nadpisz temp/humidity jeśli świeże (<1h)
4. Open-Meteo → fallback gdy WeatherAPI niedostępne
5. Cache → fallback gdy wszystko zawiedzie
```

**5 punktów decyzyjnych**, jedno źródło prawdy dla warunków pogodowych.

### Kluczowe zmiany

1. **WeatherAPI jako PRIMARY source** - dostarcza wszystkie dane (temp, wiatr, warunek, humidity)
2. **AEMET jako OPCJONALNE wzbogacenie** - tylko temp/humidity, tylko gdy dane świeże (<1h)
3. **Usunięto `prioritizeWeatherCondition()`** - brak walidacji krzyżowej
4. **Usunięto priorytetyzację warunków w interpolacji** - zaufaj najbliższej stacji
5. **Usunięto skomplikowane fallbacki wiatru/temperatury**

### Kod

**fetchLiveWeather() - nowa wersja:**
```typescript
// PRIMARY: WeatherAPI
const weatherAPIData = await fetchWeatherAPICondition(lat, lon);
if (weatherAPIData) {
  weatherData = { ...weatherAPIData };

  // OPTIONAL: AEMET enrichment (fresh data only)
  if (stationId && AEMET_API_KEY) {
    const aemetResult = await fetchAemetLiveWeather(stationId);
    if (aemetResult && observationAge < ONE_HOUR_MS) {
      // Use AEMET for temp/humidity (more accurate sensors)
      weatherData.temperature = aemetResult.data.temperature;
      weatherData.humidity = aemetResult.data.humidity;
    }
  }
}

// FALLBACK: Open-Meteo
if (!weatherData) {
  const openMeteoData = await fetchOpenMeteoCondition(lat, lon);
  // ...
}
```

**interpolateLiveWeather() - uproszczona:**
```typescript
// Use condition from closest station (we trust WeatherAPI)
const primaryData = validResults[0].result.data;
```

### Usunięte funkcje/logika
- `prioritizeWeatherCondition()` - całkowicie usunięta
- Priorytetyzacja warunków w interpolacji (conditionPriority map)
- Fallbacki wiatru na podstawie staleness
- Fallbacki temperatury na podstawie staleness
- Walidacja krzyżowa AEMET vs WeatherAPI

### Nowe logi
```
[WeatherAPI] Partly cloudy (code 1003), 20°C, wind 18 km/h, gusts 26 km/h, humidity 63%
[AEMET] Enriching with fresh sensor data (15min old): 19°C, 65%
[Live] Data source: WeatherAPI + AEMET
```

### Efekt
- Spójne dane - jedno źródło prawdy (WeatherAPI)
- Prostszy kod - łatwiejszy do debugowania
- Mniej błędów - brak walidacji krzyżowej która wprowadzała chaos
- AEMET nadal używane dla dokładniejszych pomiarów temp/humidity (gdy świeże)

### Pliki zmienione
- `src/services/weatherService.ts`:
  - `fetchLiveWeather()` - przepisana (~200 → ~80 linii)
  - `fetchWeatherAPICondition()` - dodano humidity
  - `fetchOpenMeteoCondition()` - dodano humidity
  - `interpolateLiveWeather()` - usunięto priorytetyzację
  - Usunięto `prioritizeWeatherCondition()`

---

## 2026-04-22: Calima - przywrócenie WAQI jako primary source (fix fałszywych alertów)

### Problem (2026-04-22)
Testerzy zgłaszali że alert Calima wciąż widoczny na Fuerteventurze mimo braku pyłu od doby.

### Przyczyna
Open-Meteo to model atmosferyczny aktualizowany co 6-12h - ma lag do 24h po ustaniu Calimy. Logika "użyj wyższej wartości PM10" powodowała że model Open-Meteo generował fałszywy alert mimo że WAQI (stacje real-time) pokazywało już czyste powietrze.

### Rozwiązanie (2026-04-22)
Przywrócono WAQI jako primary source. Open-Meteo używane tylko gdy WAQI niedostępne.

**Tradeoff:** Przy nadchodzącym epizodzie Calimy alert może pojawić się kilka godzin później niż model by przewidział. Ale alert znika natychmiast po ustaniu, bez fałszywego alarmu.

**Plik:** `src/services/weatherService.ts` - `fetchCalimaStatus()`

---

## 2026-03-30: Calima - użycie wyższej wartości PM10 (ODWRÓCONE 2026-04-22)

### Problem
Alerty Calima nie wyświetlały się mimo obecności pyłu. WAQI = 36 µg/m³, Open-Meteo = 53 µg/m³, próg = 50 µg/m³. WAQI ignorowało Open-Meteo gdy miało własne dane.

### Rozwiązanie (ODWRÓCONE - patrz wpis 2026-04-22)
Zmieniono logikę na "użyj wyższej wartości" - spowodowało to fałszywe alarmy po ustaniu Calimy z powodu lagu modelu Open-Meteo.

---

## 2026-04-07-12: Google Play Console - publikacja aplikacji (ZAKOŃCZONE)

### Wykonane kroki (kwiecień 2026)

1. **Konto developera Google Play** - utworzone ($25)
2. **Aplikacja utworzona** w Google Play Console
3. **Privacy Policy** - opublikowana na Notion
4. **Grafiki sklepowe** wygenerowane:
   - `assets/store/developer-icon-512.png` (512x512)
   - `assets/store/header-4096x2304.jpg` (4096x2304)
   - `assets/store/feature-graphic-1024x500.png` (1024x500)
5. **Screenshoty aplikacji** - wykonane (10 screenów)
6. **App Content** - wypełnione:
   - Privacy Policy URL
   - Content rating
   - Target audience
   - Data safety questionnaire
7. **Store Listing** - wypełnione (en-GB, pl-PL, es-ES, de-DE)

### Timeline publikacji

- **12.04.2026:** Pierwsza wersja wysłana (versionCode: 3)
- **13.04.2026:** Odrzucona przez Google - Misleading Claims policy violation
- **15.04.2026:** Poprawiona wersja wysłana (versionCode: 5) - dodano disclaimer
- **Status:** Czeka na review Google (1-3 dni)

### Przyszłe kroki

- Czekamy na akceptację Google
- Po zatwierdzeniu: 14 dni testów z 12 testerami (test zamknięty)
- Publikacja produkcyjna: ~26.04.2026

### TODO - App Store

- [ ] Założyć konto Apple Developer ($99/rok)
- [ ] Build na iOS
- [ ] Submit do App Store

---

## TODO / Przyszłe ulepszenia

- [x] ~~Użyć `interpolateLiveWeather()` w UI~~ (zrobione 2026-03-22)
- [x] ~~Rozważyć interpolację warunków pogodowych~~ (odrzucone 2026-03-26 - uproszczona architektura, zaufaj WeatherAPI z najbliższej stacji)
