# Canary Weather - Dokumentacja Projektu

## Przegląd

**Canary Weather** to mobilna aplikacja pogodowa dla Wysp Kanaryjskich, zbudowana w React Native (Expo). Aplikacja dostarcza:
- Aktualne dane pogodowe w czasie rzeczywistym (AEMET API + Open-Meteo)
- Historyczne statystyki pogodowe z 10 lat (Supabase)
- Analizę "Sun Chance" - szansy na słoneczną pogodę
- Wykrywanie Calimy (burzy piaskowej z Sahary)
- Inteligentny wybór stacji meteorologicznych

---

## Stack Technologiczny

### Frontend
| Technologia | Wersja | Zastosowanie |
|-------------|--------|--------------|
| React Native | 0.81.5 | Framework mobilny |
| Expo | 54.0.33 | Toolchain i build |
| TypeScript | 5.9.2 | Typowanie statyczne |
| React Navigation | 7.x | Nawigacja (Native Stack) |
| i18next | 25.8.4 | Internacjonalizacja (PL, EN, ES, DE) |

### Backend / Dane
| Technologia | Zastosowanie |
|-------------|--------------|
| Supabase | Baza danych PostgreSQL (dane historyczne) |
| AEMET API | Oficjalne hiszpańskie dane pogodowe (primary) |
| Open-Meteo API | Fallback dla live weather + Air Quality |

### UI/UX
| Biblioteka | Zastosowanie |
|------------|--------------|
| expo-blur | Efekty glassmorphism |
| expo-linear-gradient | Gradienty |
| react-native-svg | Ikony pogodowe, logo |
| @expo/vector-icons | Ionicons, MaterialCommunityIcons |

---

## Struktura Projektu

```
canaryweather/
├── src/
│   ├── components/          # Komponenty UI
│   │   ├── GlassCard.tsx       # Karta z efektem szkła
│   │   ├── SunChanceGauge.tsx  # Wskaźnik szansy na słońce
│   │   ├── AlertCard.tsx       # Alert Calima
│   │   ├── WeatherIcon.tsx     # Animowane ikony pogody
│   │   ├── WeatherEffects.tsx  # Efekty tła (chmury, słońce)
│   │   ├── HeroLogo.tsx        # Logo SVG (słońce + wulkan)
│   │   ├── LanguageSwitcher.tsx # Przełącznik języków
│   │   └── LocationPrompt.tsx  # Prompt lokalizacji
│   │
│   ├── screens/             # Ekrany aplikacji
│   │   ├── SearchScreen.tsx    # Wyszukiwarka z autocomplete
│   │   └── ResultScreen.tsx    # Wyniki pogodowe
│   │
│   ├── services/            # Logika biznesowa
│   │   ├── weatherService.ts   # Pobieranie danych, interpolacja
│   │   └── supabase.ts         # Klient Supabase
│   │
│   ├── constants/           # Stałe i konfiguracja
│   │   ├── theme.ts            # Kolory, typografia, style
│   │   └── locations_mapping.json # Baza stacji i miast
│   │
│   ├── i18n/                # Tłumaczenia
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── pl.json         # Polski
│   │       ├── en.json         # Angielski
│   │       ├── es.json         # Hiszpański
│   │       └── de.json         # Niemiecki
│   │
│   └── types/               # Definicje TypeScript
│       ├── weather.ts
│       └── index.ts
│
├── scripts/                 # Skrypty importu danych
│   ├── fetch-station.ts        # Pobieranie z AEMET
│   ├── upload-to-supabase.ts   # Upload do bazy
│   └── import-all.ts           # Orchestrator importu
│
├── assets/                  # Obrazy, fonty
├── supabase/                # Schema bazy danych
└── app.json                 # Konfiguracja Expo
```

---

## Kluczowe Funkcjonalności

### 1. Wyszukiwarka z Autocomplete
- **67 lokalizacji** w bazie (miasta + szczyty górskie)
- Fuzzy search po nazwach miast
- Geokodowanie dla nieznanych lokalizacji
- Wykrywanie lokalizacji użytkownika (GPS)

### 2. Live Weather (Pogoda na żywo)
**Hierarchia źródeł danych:**
1. **AEMET API** (primary) - oficjalne hiszpańskie dane
2. **Open-Meteo** (fallback) - gdy AEMET niedostępny
3. **Cache 24h** (offline) - gdy brak internetu

**Wyświetlane dane:**
- Temperatura (°C)
- Wilgotność (%)
- Prędkość wiatru (km/h)
- Stan pogody z animowaną ikoną

### 3. Sun Chance Analysis
- Analiza 10 lat danych historycznych
- Obliczanie % szansy na słoneczny dzień
- Formuła: `(dni z sol > 6h AND precip = 0) / wszystkie dni`
- Poziomy pewności: high / medium / low

### 4. Inteligentny Wybór Stacji

**Dla zwykłych lokalizacji:**
- Używa najbliższej stacji cywilnej
- Wyklucza stacje wysokogórskie (Izaña, Roque de los Muchachos)

**Dla szczytów górskich (Teide, Pico de las Nieves):**
- Preferuje stacje wysokogórskie
- **Fallback:** Gdy stacja wysokogórska jest >3x dalej niż zwykła (i zwykła <40km), używa zwykłej stacji
- Wyświetla banner informacyjny o fallbacku

### 5. Wykrywanie Calimy
- Źródło: Open-Meteo Air Quality API
- Próg wykrycia: PM10 > 50 µg/m³
- Próg "severe": PM10 > 100 µg/m³
- Wyświetla pulsujący alert z informacjami

### 6. Interpolacja Danych
Gdy najbliższa stacja jest >5km:
- Pobiera dane z 3 najbliższych stacji
- Oblicza średnią ważoną (Inverse Distance Weighting)
- Waga = 1 / odległość²

---

## Baza Lokalizacji (locations_mapping.json)

### Stacje AEMET (19 stacji)
| ID | Nazwa | Wyspa | Wysokość | Typ |
|----|-------|-------|----------|-----|
| C430E | Izaña | Tenerife | 2371m | wysokogórska |
| C101A | Roque de los Muchachos | La Palma | 2326m | wysokogórska |
| C419X | Adeje | Tenerife | 270m | cywilna |
| C689E | Maspalomas | Gran Canaria | 62m | cywilna |
| ... | ... | ... | ... | ... |

### Miasta (67 lokalizacji)
Każde miasto zawiera:
```json
{
  "name": "Pico de las Nieves",
  "island": "Gran Canaria",
  "coords": { "lat": 27.96, "lon": -15.57 },
  "isHighAltitude": true  // opcjonalne, dla szczytów
}
```

---

## API i Klucze

### Zmienne środowiskowe (.env)
```env
EXPO_PUBLIC_AEMET_API_KEY=<klucz AEMET>
EXPO_PUBLIC_SUPABASE_URL=<URL projektu Supabase>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<klucz anonimowy Supabase>
```

### Endpointy API

**AEMET (live weather):**
```
GET https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/{stationId}
Header: api_key: <AEMET_API_KEY>
```

**Open-Meteo (fallback + air quality):**
```
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m

GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm10
```

---

## Schemat Bazy Danych (Supabase)

### Tabela: weather_data
```sql
CREATE TABLE weather_data (
  id SERIAL PRIMARY KEY,
  station_id VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  tmax DECIMAL(4,1),        -- Temperatura max (°C)
  tmin DECIMAL(4,1),        -- Temperatura min (°C)
  precip DECIMAL(5,1),      -- Opady (mm)
  sol DECIMAL(4,1),         -- Godziny słońca
  is_interpolated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(station_id, date)
);
```

### Tabela: stations
```sql
CREATE TABLE stations (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100),
  island VARCHAR(50),
  latitude DECIMAL(8,4),
  longitude DECIMAL(8,4),
  altitude INTEGER
);
```

---

## Skrypty Importu Danych

### Pobieranie danych historycznych z AEMET
```bash
# Pojedyncza stacja
npm run import:station -- C430E

# Wszystkie stacje
npm run import:all
```

### Pipeline importu:
1. `fetch-station.ts` - pobiera 10 lat danych z AEMET
2. `upload-to-supabase.ts` - batch upload z retry logic

---

## Cachowanie

### In-Memory Cache (Rate Limit)
- TTL: 15 minut
- Zapobiega nadmiernym requestom do API

### AsyncStorage Cache (Offline)
- TTL: 24 godziny
- Fallback gdy brak internetu
- Klucz: `weather_cache_{stationId}`

---

## Internacjonalizacja (i18n)

**Obsługiwane języki:**
- Polski (pl) - domyślny
- Angielski (en)
- Hiszpański (es)
- Niemiecki (de)

**Przełączanie:** Komponent `LanguageSwitcher` na ekranie wyszukiwania

---

## Style i Design System

### Kolory główne (theme.ts)
```typescript
colors: {
  primary: '#F5B800',      // Złoty (słońce)
  background: '#0a1628',   // Ciemny granat
  textPrimary: '#FFFFFF',
  tempHot: '#FF6B35',      // Temperatura wysoka
  tempCold: '#4FC3F7',     // Temperatura niska
  liveGreen: '#00E676',    // Wskaźnik LIVE
}
```

### Glassmorphism
- Tło: `rgba(255, 255, 255, 0.08)`
- Border: `rgba(255, 255, 255, 0.15)`
- Blur: expo-blur

---

## Uruchamianie Projektu

### Instalacja
```bash
npm install
```

### Development
```bash
npx expo start
# lub
npx expo start --ios
npx expo start --android
npx expo start --web
```

### Wymagania
- Node.js 18+
- Expo CLI
- Xcode (dla iOS simulator)
- Android Studio (dla Android emulator)

---

## Ostatnie Zmiany (Git Log)

```
ca70e52 fix: Update fallback message wording and increase font size
024dc48 feat: Add high altitude station fallback with UI indicator
657ea5a feat: Integrate AEMET API for accurate live weather data
541df15 feat: Add Vilaflor and Garafía to cities database
f8c433b fix: Force high altitude stations for mountain peak searches
5222fd8 feat: Add mountain peaks to autocomplete with intelligent station selection
```

---

## Znane Ograniczenia

1. **Brak stacji wysokogórskiej na Gran Canarii** - Pico de las Nieves używa fallbacku do stacji lotniskowej
2. **Dane historyczne** - tylko dla stacji AEMET (19 stacji)
3. **Offline mode** - cache 24h, potem brak danych live

---

## Kontakt / Repozytorium

**GitHub:** https://github.com/Bartek6666/canaryweather

---

*Dokumentacja wygenerowana: 2026-02-14*
