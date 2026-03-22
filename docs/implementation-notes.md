# Implementation Notes - Canary Weather

Ten plik zawiera notatki z implementacji i decyzji technicznych. Sprawdzaj go na początku każdej sesji Claude Code.

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

## TODO / Przyszłe ulepszenia

- [ ] Użyć `interpolateLiveWeather()` w UI (obecnie tylko eksportowana)
- [ ] Rozważyć interpolację warunków pogodowych (nie tylko z najbliższej stacji)
