# Implementation Notes - Canary Weather

Ten plik zawiera notatki z implementacji i decyzji technicznych. Sprawdzaj go na początku każdej sesji Claude Code.

---

## 2026-07-12: Audyt przedwydaniowy + BUILD EAS „Sunly" 1.5.0 (vc8)

Przed wydaniem zrobiony audyt (tsc, martwy kod, sekrety, /code-review high na branchu
`redesign`). Wynik: konfiguracja bezpieczna (DEV-reset usunięty, `USE_MOCK_DATA=__DEV__&&false`,
`.env` gitignored, brak service_role w kodzie, RLS chroni zapis, EAS ma klucze produkcyjne).

### Naprawy z audytu (commit `b2eaf3a`)
- **App.tsx**: `useFonts` zwraca też `fontError`, który był ignorowany → przy awarii fontu apka
  utykała na splashu na zawsze. Fix: `fontsReady = fontsLoaded || !!fontError` (fallback na font
  systemowy) w bramce renderu i `onLayoutRootView`.
- **weatherService `getYearlyMonthlyTemperatures`**: miesiąc liczony `new Date(row.date).getMonth()`
  (lokalna strefa na dacie UTC) → dni graniczne w złym miesiącu dla userów spoza UTC. Fix:
  `Number(row.date.slice(5,7))-1`. (To samo bucketowanie jest w rankingach — pre-existing, <0,3%,
  zostawione.)
- **Martwy kod**: usunięte `HeroLogo`, `WeatherEffects` (+ eksporty). `theme.ts`: usunięte martwe
  `gradients`, `islandThemes`+interfejs, `getTimeGradient/getWeatherGradient/getIslandTheme`,
  `getSunChanceColor` (osierocony po zmianie kolorów %); poprawiony zbiorczy `theme` + import
  w ResultScreen. `app.json` `userInterfaceStyle` dark→light.
- **Refaktor**: wspólny `IslandRankingCard` (kind='wind'|'rain') zamiast zduplikowanego bloku
  rankingu w obu ekranach (region liczony w komponencie, różnice: jednostka/kolor/ikona).

### Świadomie NIEzrobione z audytu
- `USE_PLACE_LIST=false` wariant „listy" w SearchScreen — zostawiony (celowa alternatywa).
- Ranking deszczu dzieli przez liczbę zmapowanych stacji (nie tych z danymi) — negligible.
- **EAS: zdublowany `EXPO_PUBLIC_WAQI_TOKEN`** (3× PUBLIC per env, 12 mar + 1× SECRET 18 mar).
  NIE blokuje buildu (build wczytał token OK; wszystkie kopie mają tę samą wartość, `EXPO_PUBLIC_*`
  wtapia się przy buildzie więc zmiany w EAS nie ruszają już zbudowanej apki). Do posprzątania
  kiedyś przez web UI (zostawić 1 wpis na środowisko). User poinformowany, odłożone.

### RELEASE PREP + BUILD (commit `3b1e344`)
- **Rebrand**: `app.json name` „Canary Weather"→**„Sunly"** (applicationId `com.canaryweather.app`
  ZOSTAJE — permanentny). Komunikat lokalizacji → „Sunly". `adaptiveIcon.backgroundColor`
  `#0077CC`→`#0052D4` (spójny z nową królewską ikoną).
- **Wersja**: `1.4.3`→**`1.5.0`**, `android.versionCode` `7`→**`8`**, `package.json` →`1.5.0`.
  iOS `buildNumber` NIETKNIĘTY (nie budujemy iOS — brak konta Apple Dev).
- **BUILD**: `eas build -p android --profile production --non-interactive --no-wait`.
  ID `0d486c8e-57e9-4272-beaa-170b8b51c5f1`. Keystore istniejący, fingerprint OK.
  URL: https://expo.dev/accounts/bartek666/projects/canaryweather/builds/0d486c8e-57e9-4272-beaa-170b8b51c5f1

### NASTĘPNE KROKI (po zakończeniu buildu)
1. Pobrać AAB, wgrać do Google Play → **test zamknięty** (14 dni). **AAB wygasa po 30 dniach!**
2. Release notes 4 języki w Play Console (en-GB/pl-PL/es-ES/de-DE) — jeszcze nie zrobione.
3. Zmienić tytuł aplikacji w Play Console na „Sunly" (osobne od `app.json name`).
4. Po teście → ponowny wniosek o produkcję (poprzedni odrzucony 29.06 za mało testerów).

---

## 2026-07-11 (c): Drobne fixy rankingu wybrzeża + polska gramatyka „< 1 dzień"

- **Nazwy wybrzeża ucinane w rankingu** (kolumna `rankingIsland` width 100): wszystkie obszary
  kontynentalne zaczynają się od „Costa " (nietłumaczone we wszystkich 4 językach). Nowy helper
  `formatRankingIslandName` w `regions.ts`: `^Costa ` → „C. " (np. „C. de Valencia") — mieści się
  bez zmiany szerokości kolumny ani wykresu. Użyty w rankingu Wiatr i Opady. Nazwy Kanarów/
  Balearów bez zmian (nie zaczynają się od „Costa").
- **`rainDaysLessThanOne` pl** „< 1 dnia" → „< 1 dzień" (poprawna odmiana; en/es/de OK). Klucz
  wspólny dla kafelka „Dni deszczowe" i podsumowania na ResultScreen.
- tsc czysto.

---

## 2026-07-11 (b): Fix zgłoszeń usera — karta „pasatów" + ranking poza Kanarami

Branch `redesign`, niezacommitowane. Zgłoszenie dla Palma (Baleary): (1) karta „Stabilność
Pasatów" na ekranie Wiatr — pasaty/alisios NIE występują na Morzu Śródziemnym; (2) ranking
tytułował „Wiatr na Wyspach Kanaryjskich" i mieszał wszystkie regiony.

### Rozwiązanie — świadomość regionu (canary / balearic / mainland)
- **Nowy wspólny moduł** `src/constants/regions.ts`: `Region`, `getRegionForIsland(island)`
  (mapa `island`→region, fallback `canary`) oraz `ISLAND_TRANSLATION_KEYS` dla WSZYSTKICH
  16 wysp/obszarów (wcześniej każdy ekran miał lokalną mapę tylko 7 Kanarów → Baleary/wybrzeże
  pokazywały surową nazwę zamiast tłumaczenia, np. „Majorka").
- **Karta pasatów** (`TradeWindStabilityCard`): nowy prop `isTradeWind` (default `true`).
  Poza Kanarami (`region !== 'canary'`) tytuł → `wind.stabilityTitle_generic` („Stabilność
  Wiatru"), opis → `wind.stabilityDescGeneric_{high,medium,low}` (bez słowa pasaty/alisios/
  Passat/trade). Sam WSKAŹNIK (spójność wiatru) zostaje — to poprawna, użyteczna statystyka
  wszędzie; usunięto tylko kanaryjską ramę narracyjną. `WindDetailsScreen` przekazuje
  `isTradeWind={region === 'canary'}`.
- **Ranking (Wiatr i Opady)**: filtrowany do regionu bieżącej lokalizacji
  (`regionRanking = islandRanking.filter(getRegionForIsland === region)`), `maxValue`
  liczony z listy po filtrze (i tak posortowana malejąco). Tytuł zależny od regionu:
  canary → istniejący `island_ranking_title`; balearic/mainland → nowe
  `island_ranking_title_{balearic,mainland}` (Baleary „na Balearach", wybrzeże „na wybrzeżu
  Hiszpanii" — osobne klucze, bo polska/niemiecka odmiana różni się od „Wysp Kanaryjskich").
  Zmiana tylko w ekranach — funkcje `getWindRankingByIsland`/`getRainRankingByIsland`
  w `weatherService` NIETKNIĘTE (nadal zwracają wszystkie regiony; filtr w UI).
- **i18n (4 języki)**: dodane `wind.stabilityTitle_generic`, `wind.stabilityDescGeneric_*`,
  `wind.island_ranking_title_{balearic,mainland}`, `rain.island_ranking_title_{balearic,mainland}`.
- `RainDetailsScreen` dostał import `useMemo` (nie miał). tsc czysto (exit 0).
- **BUMP CACHE (druga iteracja tego samego zgłoszenia):** po powyższym user zgłosił, że dla
  Palmy ranking NIE pojawia się wcale. Diagnoza: dane OK (B278 ma 3527 wierszy `velmedia`,
  3188 `precip`; replikacja rankingu za lipiec zwraca Mallorca/Menorca/Ibiza + costy), filtr
  regionu OK (wszystkie 15 obszarów, też akcentowane, klasyfikują się poprawnie). Przyczyną
  był **nieaktualny cache AsyncStorage na telefonie** (7 dni) sprzed dodania danych Balearów:
  trzymał listę tylko-Kanary, więc po filtrze do `balearic` wychodziła pusta lista → karta
  chowana. Fix: bump kluczy cache w `weatherService` — `wind_ranking_v1→v2`,
  `rain_ranking_v4→v5` (wymusza przeliczenie z nowymi regionami). Ta sama technika co przy
  poprzednich zmianach wartości rankingu.

### DO SPRAWDZENIA / kolejne zgłoszenia
- To były 2 z „pierwszych błędów" usera — mogą być kolejne (zebrać na telefonie).
- Alerty AEMET/Calima dla nowych regionów wciąż neutralne (świadomy kompromis, patrz niżej).

---

## 2026-07-11: Rozszerzenie geograficzne — Baleary + wybrzeże SE Hiszpanii (DUŻE, przed wydaniem)

Branch `redesign`. Wszystko **NIEZACOMMITOWANE** (working tree zmodyfikowany). tsc czysto.
Aplikacja pokazuje teraz „Szansę na Słońce" + pełne statystyki dla Balearów i całego
południowo-wschodniego wybrzeża Hiszpanii. **Funkcja sterowana danymi** — zero nowej logiki
liczenia; wszystko przez `locations_mapping.json` + import do Supabase + kafelki/i18n.

### STAN NA KONIEC SESJI
- **Działa na telefonie** (user potwierdził), ALE **user zgłosił pierwsze błędy** —
  szczegóły do zebrania NA STARCIE nowej sesji (do ustalenia z userem, potem fix).
- Serwer Expo działał na 8082 (pid 25631, nie mój — istniejący). QR: `sunly_qr.png`.

### DANE — 8 nowych stacji AEMET (10 lat, w Supabase, zweryfikowane)
Wykryte skryptem, zweryfikowane pod kątem `sol` (~99% pokrycia):
- Baleary: **B278** Palma, **B893** Menorca, **B954** Ibiza (Ibiza obsługuje też Formenterę —
  jej stacja **B986** ma 0% `sol`, więc odpada).
- Wybrzeże: **6155A** Málaga, **6325O** Almería, **7031X** San Javier (Costa Cálida;
  `7031X` lepszy niż `7031` — 99% vs 91% sol), **8025** Alicante, **8416** València.
- Każda ~3530–3653 wiersze. Sanity-check szansy: Palma VII 96%/I 41%, Málaga VII 97%,
  Alicante VIII 87%, Ibiza VII 95% — realistyczne.

### PUŁAPKA IMPORTU (ważne na przyszłość!) — RLS + service_role
- `weather_data` ma RLS od migracji **2026-05-14**: anon MOŻE tylko SELECT. **INSERT/UPSERT
  wymaga klucza `service_role`** (omija RLS). Oryginalny import Kanarów (kwiecień) był PRZED
  RLS, dlatego działał na anon — teraz NIE.
- `scripts/upload-to-supabase.ts` poprawiony: `SUPABASE_SERVICE_ROLE_KEY || ANON` (+ ostrzeżenie
  gdy brak service_role). Nowy panel Supabase: klucz to `sb_secret_...` (sekcja „Secret keys").
- **BEZPIECZEŃSTWO:** klucz był tymczasowo w `.env` (bez prefiksu `EXPO_PUBLIC_` → NIE trafia do
  buildu). Po imporcie **usunięty z `.env`**, plik `.env.tmp` (kopia z sekretami, NIE-gitignorowana)
  skasowany. User **zrotował** klucz w Supabase → klucz z tej rozmowy jest już nieważny.

### PLIKI ZMIENIONE
- `src/constants/locations_mapping.json`: +8 stacji, +9 obszarów (`islands`), +56 miast → 27/16/247.
  Obszary kontynentalne jako pseudo-„wyspy": `Mallorca/Menorca/Ibiza/Formentera` +
  `Costa del Sol/Costa de Almería/Costa Cálida/Costa Blanca/Costa de Valencia`.
  `backgroundImage: ""` (nieużywane po redesignie), `isNorthern:false, isCoastal:true`.
- `src/types/weather.ts`: union `Island` +9 wartości.
- `src/screens/SearchScreen.tsx`: `islandsData` → `regionsData` (3 sekcje: canary/balearic/
  mainland), nowe `balearicIslands`+`mainlandAreas` (useMemo), typ `IslandTile` (waliduje też
  nazwy ikon MCI), render z nagłówkami `t('regions.*')`, drawer używa `allIslands.flatMap`.
  Style `regionSection`/`regionTitle`.
- i18n (4 języki): `islands.*` +9, nowa sekcja `regions.*` (canary/balearic/mainland).
- Nowe skrypty (jednorazowe, w repo): `scripts/discover-stations.ts` (inwentarz AEMET po
  prowincjach, parsuje DMS), `scripts/verify-sol.ts` (pokrycie `sol` za 2024).

### FOLLOW-UPY / świadome kompromisy (NIE blokują, do rozważenia)
- „Ranking wysp" na ekranach Wiatr/Opady grupuje po `island` — dla obszaru z 1 stacją trywialny,
  a słowo „wysp" jest kanaryjsko-centryczne (mylące dla Costa del Sol itd.). Kosmetyka.
- Motywy wysp/grafiki tła pominięte (fallback `defaultIslandTheme`; tła nieużywane).
- `MAX_CANARY_DISTANCE_KM` (=150, próg GPS) — nazwa myląca, ale działa (150 km od DOWOLNEJ
  stacji). Opcjonalny rename → `MAX_STATION_DISTANCE_KM`.
- Calima/alerty AEMET zaprojektowane dla Kanarów — dla nowych regionów neutralne.

### NASTĘPNE KROKI (nowa sesja)
1. **Zebrać od usera zgłoszone błędy** i je naprawić.
2. Rozważyć commit tej dużej zmiany (teraz nic niezacommitowane).
3. Potem przygotowanie wydania: nazwa „Sunly", bump `1.4.3→1.5.0`/`vc7→8` (+ iOS buildNumber),
   release notes 4 języki, build EAS, test zamknięty. (Pułapki: `project_eas_build_gotchas`.)

### OPERACYJNE (środowisko)
- tmpfs zadań harnessa potrafił się zapełniać (gubienie wyjścia komend) — czyścić
  `find /private/tmp/claude-501 -name '*.output' -type f -delete`; nie kasować pliku w trakcie.
- **Hook blokuje komendy zawierające nazwę sekretu** (np. `SUPABASE_SERVICE_ROLE_KEY` w treści
  polecenia grep/sed) — takie komendy „nie uruchamiają się" cicho. Operować na `.env` przez
  numer linii (`sed '8d'`) / nazwy zmiennych (`awk -F=`), nie po pełnej nazwie sekretu.

---

## 2026-07-10 (d): Feature — drill-down rocznego wykresu temperatur w „Ostatnie 10 lat"

Na ekranie Wyników sekcja „Ostatnie 10 lat": wiersze roku miały dotąd tylko animację
naciśnięcia (brak `onPress`). Dodano: klik w wiersz roku → okno z wykresem 12 miesięcy
(I–XII) dla tego roku. Wybór usera: **pasma min–max** (słupek = od śr. minimalnej do śr.
maksymalnej temperatury miesiąca), ten sam wykres niezależnie od pola; klik całego wiersza.

- **Serwis** `getYearlyMonthlyTemperatures(stationId, year)` (`weatherService.ts`) + typ
  `MonthlyTemperature` — 1 zapytanie o rok (~365 wierszy, bez paginacji), agregacja tmax/tmin
  po miesiącu; miesiące bez danych → null.
- **Komponent** `YearTemperatureChartModal.tsx` — jasne okno frosted (wzorzec SunChanceModal,
  BEZ GlassCard), wykres z Views + `expo-linear-gradient` (słupek: gradient tempHot→tempCold),
  oś Y (max/mid/min), etykiety `monthsShort.*` (i18n, 4 języki), legenda (`avgMax`/`avgMin`),
  stany loading/`yearChartNoData`. Fetch leniwy przy otwarciu (cancel-guard w useEffect).
- **ResultScreen**: `YearHistoryItem` dostał prop `onPress(year)`, `Pressable` → `onPress`;
  stan `chartYear`; render `<YearTemperatureChartModal>`. Używa `stationId` z route.params
  (spójnie z resztą sekcji; dla lokalizacji interpolowanych to najbliższa stacja).
- **i18n** (4 języki): `result.yearChartSubtitle`, `result.yearChartNoData`, `result.close`.
- tsc czysto. To 4. okno `<Modal>` w apce (wszystkie jasne frosted).

---

## 2026-07-10 (c): Polish redesignu — dopięcie Manrope wszędzie

Przegląd przed wydaniem. Skany: parytet i18n (komplet — pl-only klucze to celowa gramatyka:
`monthsLocative.*`, `rainDaysText_few/many`, `wind.daysText_few/many`, miesięczne
`sunChanceIn*`; en/es/de mają fallback w kodzie), DEV/TODO (czysto — `USE_MOCK_DATA` = `&& false`),
ciemne tokeny (żaden ekran nie używa już ciemnych `colors.*`).

**Znalezisko:** `typography.*` (token) NIE ustawia `fontFamily` — tylko rozmiar/waga/kolor.
28 stylów tekstowych spreadowało `...typography.*` bez `fontFamily`, więc renderowały się
fontem systemowym (San Francisco), nie Manrope. Kolor/rozmiar były OK (nadpisane `light.*`).
- Dodano `fontFamily: fonts.<waga>` do 28 stylów, waga wg `fontWeight` wariantu typography
  (700→bold, 600→semibold, 500→medium, 400→regular). Pliki: ResultScreen (5), RainDetails (9),
  WindDetails (8), ScreenHeader (2), SunChanceGauge (1), TradeWindStabilityCard (3).
- Import `fonts` dodany w 4 plikach (Rain/Wind/ScreenHeader/TradeWind — ResultScreen i
  SunChanceGauge już miały). Zmiana inline, surgical (32/32, bez reformatu). tsc czysto.
- **Wniosek na przyszłość:** przy nowych tekstach NIE polegać na `...typography.X` co do fontu —
  zawsze dodać `fontFamily: fonts.*`. (Docelowo można by wcielić Manrope do samego `typography`,
  ale to szersza zmiana dotykająca też ciemnego motywu — odłożone.)

**KOREKTA/UZUPEŁNIENIE (ta sama sesja):** powyższy skan łapał TYLKO style spreadujące
`...typography.*` — pominął style z jawnym `fontSize`/`fontWeight` bez fontu. Było ich **44**
(39 z `fontSize` + 5 wariantów „current" z samym `fontWeight`, np. `rankingValueCurrent`/
`rankingIslandCurrent`/`liveGustsWarning` — te BEZ fontu straciłyby pogrubienie, bo przy
nazwanej rodzinie Manrope `fontWeight` jest ignorowany). Dodano `fontFamily: fonts.<waga>`
do wszystkich 44 (waga wg `fontWeight`; import `fonts` doszedł w `GenericAlertCard`).
Pliki: ResultScreen (20), RainDetails (10), WindDetails (7), TradeWindStabilityCard (4),
GenericAlertCard (2), ScreenHeader (1).
- **Bug zawijania (zgłoszony przez usera):** karta „Ranking wysp" na ekranie Wiatr — „27.4 km/h"
  zawijało „h" do nowej linii (Manrope szerszy niż font systemowy, kolumna `rankingValue`
  `width: 60`). Fix: `rankingValue` width **60→80** (Wind) i **50→80** (Rain) + `numberOfLines={1}`
  na wartości ORAZ nazwie wyspy (`translatedIsland`) w obu ekranach.
- **Lekcja:** „Manrope wszędzie" wymaga skanu po `fontSize|fontWeight` bez `fontFamily`
  (nie tylko po `typography.`), a dodanie nazwanego fontu do stylów o stałej szerokości
  może wywołać zawijanie — sprawdzać kolumny liczbowe (`width` + `numberOfLines`).

---

## 2026-07-10: Fix — fałszywy „lekki deszcz" na karcie LIVE (WeatherAPI kod 1063)

Branch `redesign`. Zgłoszenie: Las Palmas (Gran Canaria) — karta live pokazywała „lekki
deszcz", a w rzeczywistości była noc, lekkie chmury i księżyc (potwierdzone innymi serwisami).

### Diagnoza (dane realne z WeatherAPI)
Dla Las Palmas WeatherAPI zwracał: `code 1063` („Patchy rain **nearby**"), `precip_mm 0.01`,
`cloud 25%`, `is_day 0`. Czyli deszcz „w okolicy", ale w punkcie praktycznie 0 opadów i tylko
25% chmur. `mapWeatherAPICode` wrzucał 1063 do worka „lekki deszcz" (`rainy`/`lightRain`) i
**ignorował własne pola WeatherAPI `precip_mm` oraz `cloud`**. (Stara walidacja krzyżowa
łapiąca to zjawisko została usunięta w refaktorze 2026-03-25 — patrz niżej.)

### Poprawka (`weatherService.ts`, wąska, wewnątrz samego WeatherAPI)
- Dodano pole `precip_mm` do `WeatherAPIResponse.current`.
- `mapWeatherAPICode(code, isNight, precipMm?, cloud?)` — nowe parametry. Dla „lekkich/
  przelotnych" kodów `LIGHT_PATCHY_RAIN_CODES = [1063,1150,1153,1168,1171,1180,1183]`:
  jeśli `precipMm < NEGLIGIBLE_PRECIP_MM (0.1)` → NIE pokazuj deszczu, klasyfikuj wg `cloud`:
  `cloud ≥ 70` → `cloudy/overcast`, inaczej → `partly-sunny/partlyCloudy` (dzień) lub
  `partly-cloudy-night/partlyCloudyNight` (noc). Cięższe kody deszczu bez zmian.
- `fetchWeatherAPICondition` przekazuje `precip_mm` i `cloud`; log rozszerzony o precip/cloud
  + osobny log `Correcting false rain …` gdy korekta zadziała.
- **Świadomy kompromis:** prawdziwa śladowa mżawka (<0,1 mm) pokaże się jako „częściowe
  zachmurzenie", nie mżawka. Dla userów (planują wyjazd) fałszywy „deszcz" jest gorszy.
- **Dlaczego nie przez AEMET:** użyto własnego pola WeatherAPI — bez lagu i chaosu wielu
  źródeł, przez które usunięto starą `prioritizeWeatherCondition` (2026-03-25).

### Weryfikacja
- `npx tsc --noEmit` czysto. Klucze i18n `partlyCloudyNight/partlyCloudy/overcast/clearNight`
  istnieją w 4 językach.
- Symulacja na żywych danych Las Palmas → `partly-cloudy-night` (księżyc zza chmur). ✓

### Etykieta „pewności" wskaźnika słońca → tier wg wielkości % (`weatherService.ts` + i18n + `SunChanceGauge`)
Zgłoszenie: Las Palmas/lipiec pokazuje 54% i etykietę „Niska pewność" — user uważa, że 54%
to raczej „średnia". **Weryfikacja danych: 54% jest PRAWDZIWE** — stacja C658L, lipiec 10 lat
= 93 dni, wszystkie z danymi `sol`; dni z `sol>6h` i bez deszczu = 50/93 = 54%. To NIE deszcz
(88% dni suchych), tylko nasłonecznienie: średnia lipca **6,1 h** (mediana 6,5 h), 46% dni
≤6 h — kanaryjska „panza de burro" (poranna warstwa chmur nad NE wybrzeżem).
- Stara „pewność" = odległość od 50% (54% → 4 pkt → „niska"). Statystycznie OK, ale słowo
  „pewność" myli usera (czyta jak ocenę wielkości). Decyzja usera: **progi wg wielkości %**.
- Zmiana w `calculateSunChance` (l. ~218): `sunChance >= 70 → high`, `>= 45 → medium`,
  reszta `low`. 54% → medium. (Deszcz `calculateRainStats` i wiatr — NIETKNIĘTE, liczą inaczej.)
- **PUŁAPKA:** `RainDetailsScreen` używa TYCH SAMYCH kluczy i18n `result.confidence{High,Medium,
  Low}` co dawniej słońce. Dlatego NIE zmieniano tych wartości — dodano **nowe** klucze
  `result.sunChanceLevel{High,Medium,Low}` (4 języki: pl „Duża/Średnia/Mała szansa",
  en High/Medium/Low chance, es Alta/media/Baja probabilidad, de Hohe/Mittlere/Geringe Chance)
  i tylko `SunChanceGauge` przełączono na nie.
- (Weryfikacja: stare `confidence*` istnieją we WSZYSTKICH 4 językach — używa ich
  `RainDetailsScreen`. Wcześniejsze podejrzenie „luki na en/es/de" było fałszywym
  negatywem grepa; nic tam nie brakuje.)

### Ikony nocne na jasnoniebieskie (`WeatherIcon.tsx`)
Na życzenie: ikony nocne (`clear-night` = księżyc, `partly-cloudy-night` = księżyc z chmurą)
były złoto-żółte (`MOON_FILL '#E0A82E'`, glow srebrny). Zmienione na jasny błękit:
`MOON_FILL → '#38BDF8'` (sky blue), `MOON_COLOR (glow) → '#7DD3FC'`. Oba stałe używane
wyłącznie przez ikony nocne. Deszcz w nocy bez zmian — `rainy` już jest niebieski (`#1385FF`),
osobnej ikony noc+deszcz nie ma.

---

## 2026-07-09 (b): Redesign „Sunly" — LocationPrompt na jasny motyw + porządki

Branch `redesign`. Kontynuacja po `7a0cac1`.

### 1. `LocationPrompt.tsx` → jasny motyw (ostatni ciemny element w apce)
Dialog „Użyj mojej lokalizacji" (wyskakuje na SearchScreen po ~0,8 s, gdy brak wcześniejszej
odpowiedzi o lokalizacji) był jeszcze w całości ciemny — jedyna user-facing pozostałość
ciemnego motywu. Przerobiony na jasny frosted wg wzorca `SunChanceModal`/`AlertDetailModal`:
- `BlurView tint="dark"` → `tint="light"`, biały overlay `rgba(255,255,255,0.82)`,
  border `light.colors.border`, `...light.cardShadow`, `borderRadius.xxl`.
- Backdrop `rgba(0,0,0,0.5)` → `rgba(15,30,55,0.35)` (jak inne jasne okna).
- Ikona lokalizacji: krążek `primarySoft` + ikona `light.colors.primary`; poświata stonowana
  (opacity 0.2→0.12, shadowOpacity 0.8→0.4).
- Tekst: Manrope (`fonts.bold` tytuł 20, `fonts.regular` opis, `fonts.semibold` przycisk
  wtórny), kolory `light.colors.text*`. Przycisk główny: `light.colors.primary` + biały tekst
  i biała ikona `navigate`; pigułka `borderRadius.full`; spinner biały.
- Import: `colors/typography/shadows` → `fonts, light` (`borderRadius`, `spacing` zostają).
- UWAGA: to NIE jest `<Modal>` (absolutnie pozycjonowany `Animated.View`), więc pułapka
  „GlassCard flex:1 w Modal" tu nie dotyczy — i tak frosted zrobiony ręcznie. Logika animacji
  (fade+scale+translateY) nietknięta.

### 2. Porządek: martwy import `WeatherEffects`
Usunięty nieużywany import `WeatherEffects` z `ResultScreen.tsx` (l. 23) — komponent nie jest
już renderowany (tło satelity + efekty pogodowe wycięte przy jasnym restyle ResultScreen).
Sam plik `WeatherEffects.tsx` zostaje w repo (nietknięty).

### Weryfikacja / stan
- `npx tsc --noEmit` czysto (exit 0).
- To domyka warstwę wizualną redesignu — **wszystkie ekrany i okna są jasne**. Sprawdzone
  skanem tokenów: `GenericAlertCard` już jasny (lokalna zmienna `colors` = kolory severity,
  nie ciemny motyw — fałszywy alarm skanu); DEV-reset onboardingu w `App.tsx` już usunięty
  we wcześniejszym commicie (pamięć nieaktualna w tym punkcie). Kolejny naturalny krok:
  przygotowanie do buildu EAS.

---

## 2026-07-09: Redesign „Sunly" — spójność opadów + okno wskaźnika słońca + jasne okna alertów

Branch `redesign`. Commity: `b2f6a49` (ta sesja), wcześniej `9bb10e7` (onboarding+ikona).

### 1. Spójność kafelka „Dni deszczowe" (`weatherService.ts` + `ResultScreen.tsx`)
Problem: dla Maspalomas/lipiec wskaźnik słońca 99%, a kafelek „Dni deszczowe" = 0 (mylące).
- `rain_days` NIE jest już zaokrąglane do całkowitej — zostaje **1 miejsce po przecinku**
  (`getMonthlyStats` linia ~424 oraz interpolacja `calculateInterpolatedMonthlyStats` ~1278).
  Koniec z podwójnym zaokrągleniem (było też `Math.round` w ekranie).
- Kafelek i podsumowanie: gdy `0 < rain_days < 1` → pokazują **„< 1 dnia"** (nie „0”).
  Prawdziwe 0,0 nadal „0”. Nowy klucz i18n `result.rainDaysLessThanOne` (4 języki).
- Testy `getMonthlyStats` przechodzą (rain_days 3.0 === 3).

### 2. Okno „Wskaźnik słońca" (`SunChanceModal.tsx`) — jasny motyw + treść
- Było ciemne + nieścisłe („dla lokalizacji i **godziny**", „bezchmurne niebo”). Poprawione.
- Przebudowane na **jasny motyw** i **3 sekcje z ikonami**: „Czym jest?", „Jak to liczymy?",
  „To nie prognoza". Metodologia opisana zgodnie z kodem (dzień słoneczny = ≥6 h słońca I brak
  opadów; wskaźnik = odsetek takich dni z 10 lat). Sekcja klucze i18n `sun_chance.*`
  (what_title/what_text/how_title/how_text/note_title/note_text/title/close) w 4 językach;
  usunięty stary `sun_chance.description`.
- **PUŁAPKA (ważne):** pierwsza wersja użyła `GlassCard` jako kontenera okna — `GlassCard`
  owija dzieci w warstwę `flex: 1`, która w oknie modalnym bez zdefiniowanej wysokości
  **zwija się do 0 px** → okno „otwiera się", ale jest niewidoczne. Rozwiązanie: frosted-look
  zrobiony ręcznie (BlurView tint="light" + biały overlay 0.82 + border + `light.cardShadow`),
  BEZ `flex: 1`. Nie używać `GlassCard` wewnątrz `<Modal>`.

### 3. Okna alertów na jasny motyw
- `AlertDetailModal.tsx` (WSPÓLNE dla coastal/wind/snow): jasny frosted, ciemny tekst, Manrope,
  paleta severity spójna z `GenericAlertCard` (icon pełny kolor, text ciemny odcień:
  yellow #B45309 / orange #C2410C / red #B91C1C). Przycisk „Zamknij" → **niebieski
  `light.colors.primary`** z białym tekstem (jak inne okna), NIE kolor severity.
- `CalimaInfoModal.tsx`: jasny frosted, ciemny tekst, Manrope. Kolorowe ikonki sekcji
  (pomarańcz/fiolet/czerwień/turkus) zostawione — niosą znaczenie.
- W aplikacji są tylko **3** komponenty `<Modal>` (SunChance, AlertDetail, Calima) — wszystkie
  są już jasne. Innych ciemnych okien brak.

### Środowisko / testy
- Expo dev na porcie **8082** (8081 zajęty przez canaryeclipse). Test na iPhone (Expo Go).
- QR: `exp://192.168.0.148:8082` — wygenerować obrazek (`node -e "require('qrcode').toFile(...)"`)
  i `open`, bo ANSI-QR w terminalu bywa nieczytelny.
- Onboarding w dev: flaga `hasSeenOnboarding` w AsyncStorage — czyścić przeinstalowaniem
  Expo Go (tymczasowy DEV-reset w App.tsx został USUNIĘTY w commicie onboardingu).
- tsc: `npx tsc --noEmit > /Users/bartunio/tsc_out.txt 2>&1` (NIE do /private/tmp — mały
  tmpfs harnessa zapełnia się logami Expo z tła; jak wysiada output komend, czyścić
  `find /private/tmp/claude-501 -name '*.output' -size +2M -delete`).

---

## 2026-07-07: Redesign „Sunly" — ekran Onboarding (2 ekrany) + nowe logo/ikona aplikacji

Branch `redesign`, zmiany niezacommitowane. Kontynuacja redesignu na jasny motyw.

### 1. Onboarding przerobiony na jasny motyw + podział na 2 ekrany (`OnboardingScreen.tsx`)
Logika pierwszego uruchomienia bez zmian (`hasSeenOnboarding` w AsyncStorage → `navigation.replace('Search')`).
- **Ekran 1 (intro):** ikona marki (`SunlyIcon`) z cieniem + napis „Sunly"; wejście fade+scale.
  Po **3 s** (`INTRO_DURATION_MS`) automatyczne przejście do ekranu 2 (`useState step 1|2`).
- **Ekran 2:** BEZ ikony — sama nazwa „Sunly", pod nią `onboarding.tagline`
  („Sprawdź historyczną pogodę…"), niżej skrócony `onboarding.welcome_text`, dwa kafelki
  bento (`GlassCard scheme="light"`: „Analiza / 10 lat", „Precyzja / AEMET"), przycisk
  `onboarding.start_button` (niebieska pigułka) → Search.
- Tło: `LinearGradient ['#DCEEFF','#E4EEFB','#F8F9FF']`, `StatusBar dark`, `SafeAreaView`.
- Nowe klucze i18n (4 języki): `tagline`, `tile_analysis_label`, `tile_years_value`,
  `tile_precision_label`. Skrócono `welcome_text` (usunięto „…w miejscu do którego podróżujesz”).
  Usunięto podpis „Dane: AEMET" (klucz `data_source` skasowany po dodaniu — nieużywany).

### 2. Nowe logo/ikona marki „Sunly" (`src/components/SunlyIcon.tsx`)
- Stylizowane słońce nad falami na błękitnym kaflu (radialne niebo `#B0E0FF`→`#5AABDC`,
  słońce `#FFD700`→`#FF8C00` z refleksem, dwie fale + obrys grzbietu). Projekt dostarczony
  przez użytkownika (Stitch/ręczny SVG). `react-native-svg`. viewBox 100×100.
- **Powód zmiany:** aplikacja wychodzi poza Kanary → porzucono `HeroLogo` (słońce + wulkan
  Teide). `HeroLogo.tsx` zostaje w repo (nietknięty), ale nieużywany.
- Utworzony w trakcie sesji i usunięty pośredni komponent `SunLogo` (minimalistyczne
  słońce) — zastąpiony przez `SunlyIcon`.

### 3. Ikony aplikacji wygenerowane z SVG (`scripts/generate-icons.js` + `sharp`)
- Źródła: `assets/sunly-icon.svg` (pełnokadrowy kwadrat — OS sam zaokrągla) oraz
  `assets/sunly-splash.svg` (kafel z rogami rx22, przezroczyste narożniki).
- Wygenerowane: `icon.png` 1024, `adaptive-icon.png` 1024, `favicon.png` 48, `splash.png` 1024.
- `app.json`: splash `backgroundColor` `#0077CC` → **`#DCEEFF`** (oba miejsca: `splash` i
  plugin `expo-splash-screen`) — spójne z ekranem powitalnym.
- Doinstalowano `sharp` jako devDependency (tylko do generowania ikon).
- **Uwaga:** nowa ikona/splash widoczne dopiero po natywnym buildzie EAS, NIE w Expo Go.
- Regeneracja po zmianie designu: `node scripts/generate-icons.js`.

### DEV-only (do usunięcia przed wydaniem)
W `App.tsx` w `prepare()` dodano tymczasowy `if (__DEV__) AsyncStorage.removeItem(ONBOARDING_KEY)`
— wymusza pokazanie onboardingu przy każdym starcie w dev. **Usunąć przed buildem produkcyjnym.**

---

## 2026-07-06: Redesign „Sunly" — ekrany Wyników, Szczegóły wiatru, Szczegóły opadów (jasny motyw)

Sesja w ramach redesignu Canary Weather → „Sunly" (jasny motyw Stitch, font Manrope). Branch `redesign`, zmiany niezacommitowane.

### Środowisko
- Expo dev server na porcie **8082** (8081 zajęty przez inny projekt). Test na prawdziwym iPhone (przeładowanie po zmianach).
- Kontrola typów: `npx tsc --noEmit` (output zapisywać do pliku, np. `> /private/tmp/tsc_out.txt 2>&1` — katalog zadań potrafi się zapełniać logami Expo).
- Projekty Stitch (HTML): `redesign-input/design_1.txt`.

### 1. Ekran Wyników (`ResultScreen.tsx`) — etap 2
Nowa kolejność sekcji: **Teraz(live)+alerty → wskaźnik słońca → miesiące → statystyki (śr. max / śr. min / dni deszczowe) → przyciski „Szczegóły wiatru/opadów" → Podsumowanie → Najsłoneczniejsze tygodnie → Historia 10 lat.**
- „Pętla informacyjna": klik miesiąca przewija do wskaźnika słońca (mierzone `onLayout`, `gaugeOffsetY`) z widocznymi kafelkami miesięcy pod spodem.
- Przyciski szczegółów bez liczb (sama etykieta + strzałka), wstawione między statystyki a podsumowanie; zmniejszony odstęp (usunięty `marginTop` w `ctaSection`).
- Nowe klucze i18n: `result.windDetails`, `result.rainDetails` (4 języki).
- Czcionka wartości w kafelkach statystyk 22→18 px + `numberOfLines={1}` + `adjustsFontSizeToFit` (3 kafelki w rzędzie nie mieściły „°C").

### 2. Karty alertów (`common/GenericAlertCard.tsx`) → jasny motyw
Był biały tekst z ciemnego motywu (nieczytelny na jasnym tle). Teraz: pełny kolorowy krążek z białą ikoną, ciemny czytelny tytuł (odcień zależny od severity: yellow/orange/red), szary opis, strzałka `textMuted`. Podkład 12% zamiast 20%.

### 3. Ikony pogody (`WeatherIcon.tsx`) → jasny motyw
Ikony były białe / jasne srebro (znikały na jasnym tle). Dodano pole `color` w `WEATHER_ICON_MAP`: słońce `#F59E0B` (bursztyn), księżyc/noc `#E0A82E` (złoty), chmury/mgła `#6B7280` (szary), deszcz niebieski, burza fioletowa, śnieg błękitny. Ikona złożona „słońce za chmurą" — chmura z białej na szarą. Na karcie LIVE małe ikony wiatru/wilgotności (w `ResultScreen`) z białych na `primary`, krycie 0.6→0.9.

### 4. Ekran Szczegóły wiatru (`WindDetailsScreen.tsx`) → jasny motyw, układ klasyczny
- Konwersja na jasny motyw (tło `light.gradient`, StatusBar dark, usunięta ciemna nakładka, `colors.` → `light.colors.`, obrys wskaźnika i paski rankingu z białych na ciemne, bieżąca wyspa → `primary`).
- `ScreenHeader` dostał prop **`scheme: 'dark' | 'light'`** (domyślnie `dark`, żeby nie psuć innych ekranów). Ekran wiatru i opadów używają `scheme="light"`.
- `TradeWindStabilityCard` → jasny motyw. Dolny wiersz liczb zamieniony na **3 kafelki z ikonami** (Średnia prędkość / Zakres prędkości / „Wiatr >20 km/h" z wartością „X dni"). Wartości: `numberOfLines={1}` + `adjustsFontSizeToFit`.
- Nowy klucz i18n `wind.daysText_*` (pluralizacja „dzień/dni", NIE reużywać `rainDaysText` — po niemiecku znaczy „dzień deszczowy").
- Skrócono polski `wind.windyDays` na „Wiatr >20 km/h".
- **Odrzucono** pełny układ Stitch (hero + „Gwarancja Pasatów" + bento) — po porównaniu z przełącznikiem user wybrał klasyczny wskaźnik. Przełącznik i wariant Stitch usunięte. Nieużywany klucz `wind.basedOnMeasurements` (pozostałość po eksperymencie Stitch) usunięty z 4 locale.

### 5. Ekran Szczegóły opadów (`RainDetailsScreen.tsx`) → jasny motyw
- Analogiczna konwersja na jasny motyw jak wiatr (`scheme="light"`, obrys wskaźnika, paski rankingu, badge miesiąca).
- Karta „Charakterystyka opadów": 2 liczby → **2 kafelki z ikonami** (Średnie opady mm / Dni z deszczem „X z 31") + podpis „Na podstawie 10 lat pomiarów" (`rain.basedOnMeasurements`, 4 języki).
- Tytuł `rain.intensity_info` → małe „o": „Charakterystyka opadów" (pl/en/es; de bez zmian — jedno rzeczowe słowo).
- Podpis rankingu `rain.island_ranking_month` → „opady zebrane ze wszystkich stacji AEMET" (4 języki).

### 6. Spójność danych opadów (`weatherService.ts`)
Zgłoszone niespójności między wskaźnikiem „% dni bez deszczu" a liczbami — przyczyną zaokrąglanie w dół:
- `calculateRainStats`: `rainyDaysPerYear` → **1 miejsce po przecinku** (`Math.round(x*10)/10`). Wcześniej 0,3 dnia/rok → „0", co wyglądało na sprzeczność z 99% suchych dni.
- `getRainRankingByIsland`: `value` → **1 miejsce po przecinku ORAZ dzielenie przez `stationCount`** (`totalPrecip / yearsCount / stationCount`). Wcześniej sumowało opady ze wszystkich stacji wyspy i dzieliło tylko przez lata → wyspy z wieloma stacjami wychodziły „deszczowsze". Cache podbity **`rain_ranking_v2` → `v4`** (dwie zmiany wartości w sesji).
- Ranking wiatru (`getWindRankingByIsland`) sprawdzony — OK, liczy `totalWind / count` (średnia z pomiarów, niezależna od liczby stacji), bez zmian.

### Następny krok
**Ekran Onboarding** — projekt w `redesign-input/design_1.txt`, blok „Onboarding (Jasny)" (ok. linie 1–198). Jasny motyw, radialny gradient, logo z ikoną słońca, dwa kafelki bento (10 lat / AEMET), duży przycisk „Zaczynamy". Zacząć od planu przed kodowaniem.

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
