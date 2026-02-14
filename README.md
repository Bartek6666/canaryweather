# Canary Weather

Aplikacja mobilna do sprawdzania aktualnej i historycznej pogody na Wyspach Kanaryjskich.

## Funkcje

- **Live Weather** - aktualne dane z AEMET API (oficjalna służba meteo Hiszpanii)
- **Sun Chance** - analiza szansy na słońce na podstawie 10 lat danych historycznych
- **Calima Alert** - wykrywanie burzy piaskowej z Sahary (monitoring PM10)
- **Smart Search** - 67 lokalizacji z autocomplete (miasta + szczyty górskie)
- **Inteligentny wybór stacji** - automatyczny fallback dla lokalizacji wysokogórskich
- **Tryb Offline** - 24-godzinny cache dla dostępu bez internetu
- **Wielojęzyczność** - Polski, Angielski, Hiszpański, Niemiecki

## Stack Technologiczny

| Kategoria | Technologie |
|-----------|-------------|
| Frontend | React Native 0.81, Expo 54, TypeScript |
| Backend | Supabase (PostgreSQL) |
| API | AEMET API, Open-Meteo |
| UI | Glassmorphism, expo-blur, react-native-svg |
| i18n | i18next (4 języki) |

## Szybki Start

```bash
# Instalacja zależności
npm install

# Konfiguracja zmiennych środowiskowych
cp .env.example .env
# Edytuj .env i dodaj klucze API

# Uruchomienie serwera deweloperskiego
npx expo start

# Uruchomienie na symulatorze iOS
npx expo start --ios

# Uruchomienie na emulatorze Android
npx expo start --android
```

## Zmienne Środowiskowe

```env
EXPO_PUBLIC_AEMET_API_KEY=twoj_klucz_aemet
EXPO_PUBLIC_SUPABASE_URL=twoj_url_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=twoj_klucz_supabase
```

## Struktura Projektu

```
src/
├── components/      # Komponenty UI (GlassCard, WeatherIcon, AlertCard...)
├── screens/         # SearchScreen, ResultScreen
├── services/        # weatherService, klient supabase
├── constants/       # theme, baza lokalizacji
├── i18n/            # tłumaczenia (pl, en, es, de)
└── types/           # definicje TypeScript
```

## Źródła Danych

| Źródło | Zastosowanie |
|--------|--------------|
| **AEMET API** | Główne źródło danych live (oficjalna służba meteo Hiszpanii) |
| **Open-Meteo** | Fallback weather + Air Quality (wykrywanie Calimy) |
| **Supabase** | 10 lat danych historycznych z 19 stacji AEMET |

## Kluczowe Algorytmy

### Obliczanie Sun Chance
```
Sun Chance = (dni z słońcem > 6h AND opady = 0) / wszystkie dni
```

### Wybór Stacji
- Zwykłe lokalizacje → najbliższa stacja cywilna
- Szczyty górskie → preferuj stację wysokogórską, fallback jeśli zbyt daleko (>3x dystans)

### Interpolacja Pogody
Gdy najbliższa stacja > 5km: średnia ważona z 3 najbliższych stacji (Inverse Distance Weighting).

## Design

Aplikacja wykorzystuje estetykę **Glassmorphism** z ciemnym granatowym tłem i przezroczystymi kartami z efektem rozmycia.

## Dokumentacja

Szczegółowa dokumentacja techniczna: [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)

## Licencja

Projekt prywatny.

---

*Built with React Native + Expo for the Canary Islands*
