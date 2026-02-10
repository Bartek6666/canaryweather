# Canary Weather

Aplikacja mobilna do sprawdzania historycznej i aktualnej pogody na Wyspach Kanaryjskich.

## Funkcje

- **Live Weather** - aktualna pogoda z Open-Meteo API z animowaną kartą
- **Sun Chance** - historyczna szansa na słoneczną pogodę na podstawie 10 lat danych AEMET
- **Tryb Offline** - cache danych pogodowych w AsyncStorage
- **Pull-to-Refresh** - odświeżanie danych przez przeciągnięcie
- **Calima Alert** - ostrzeżenia o burzach piaskowych z Sahary (PM10)
- **Best Time to Visit** - rekomendacje najlepszych tygodni w roku
- **Wielojęzyczność** - PL, EN, DE, ES

## Technologie

- React Native + Expo
- TypeScript
- Supabase (baza danych historycznych)
- Open-Meteo API (dane live)
- AsyncStorage (cache offline)
- react-native-svg
- i18next

## Uruchomienie

```bash
# Instalacja zależności
npm install

# Uruchomienie w trybie deweloperskim
npm start

# iOS
npm run ios

# Android
npm run android
```

## Struktura projektu

```
src/
├── components/       # Komponenty UI (GlassCard, HeroLogo, SunChanceGauge, etc.)
├── constants/        # Stałe, theme, konfiguracja
├── i18n/            # Tłumaczenia (pl, en, de, es)
├── screens/         # Ekrany (SearchScreen, ResultScreen)
├── services/        # Serwisy (weatherService, supabase)
└── types/           # Definicje TypeScript
```

## Design

Aplikacja wykorzystuje estetykę Glassmorphism z ciemnym granatowym tłem i przezroczystymi kartami z efektem rozmycia.

## Dane

- Dane historyczne: 17 stacji AEMET, 10 lat pomiarów
- Dane live: Open-Meteo API (bezpłatne, bez klucza API)
- Jakość powietrza: Open-Meteo Air Quality API

## Licencja

Projekt prywatny.
