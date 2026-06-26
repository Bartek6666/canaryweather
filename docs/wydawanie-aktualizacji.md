# Ściąga: jak wydać aktualizację aplikacji (Google Play)

Prosty przewodnik krok po kroku do wypuszczania nowych wersji Canary Weather.
Aktualny stan na 26.06.2026: wersja **1.4.3**, versionCode **7**.

---

## Zasada nadrzędna: dwa numery wersji

Przy każdej aktualizacji zmieniają się dwa numery w pliku `app.json`:

- **`version`** (np. `1.4.3`) — wersja widoczna dla użytkownika. Zmieniaj, gdy chcesz (np. `1.4.4` przy drobnej poprawce, `1.5.0` przy nowej funkcji).
- **`versionCode`** (np. `7`) — wewnętrzny numer dla Google. **MUSI rosnąć o 1 przy KAŻDYM nowym pliku.** Jeśli go nie podbijesz, Google odrzuci plik komunikatem „kod wersji już w użyciu".

---

## Krok po kroku

### 1. Podbij numery wersji w `app.json`
- `version` → np. z `1.4.3` na `1.4.4`
- `versionCode` → zawsze +1 (z `7` na `8`)

### 2. Zbuduj nowy plik AAB
W terminalu, w katalogu projektu:
```bash
EAS_SKIP_AUTO_FINGERPRINT=1 EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli build --platform android --profile production --no-wait
```
- `EAS_SKIP_AUTO_FINGERPRINT=1` — pomija krok, który potrafił się zawieszać.
- `--no-wait` — nie blokuje terminala; build leci na serwerach Expo (~10–15 min).
- Komenda wypisze link do podglądu builda.

### 3. Poczekaj, aż build się skończy
- Otwórz link z podglądem albo sprawdź status:
```bash
npx eas-cli build:list --platform android --limit 1
```
- Status `finished` = gotowe. Status `errored` = błąd (patrz „Częste problemy").

### 4. Pobierz plik AAB
- **Pobierz go tego samego dnia!** Link do pliku wygasa po 30 dniach.
- Najprościej: na stronie builda kliknij zielony przycisk **Download**.

### 5. Wgraj do Google Play Console
1. Wejdź na **Google Play Console → Canary Weather**.
2. **Testuj i publikuj → Produkcyjna** (lub najpierw **Testowanie → Test zamknięty**, jeśli chcesz wcześniej sprawdzić).
3. **Utwórz nową wersję** → wgraj plik `.aab`.
4. W polu **„Informacje o wersji"** wpisz notatki o wydaniu między tagami języka, np.:
   ```
   <en-GB>
   What's new: ...
   </en-GB>
   ```
5. **Zapisz → Przejrzyj wersję → Prześlij do sprawdzenia.**

### 6. Poczekaj na recenzję Google
- Zwykle godziny do 1–2 dni (znana aplikacja = szybciej).
- Po zatwierdzeniu aktualizacja trafia do użytkowników.

---

## Dobre nawyki

- **Najpierw test, potem produkcja.** Możesz najpierw wgrać wersję do **testu zamkniętego**, sprawdzić u siebie/testerów, a potem wypchnąć tę samą do **produkcji**.
- **Stopniowe wdrażanie.** Przy wydaniu produkcyjnym możesz wypuścić np. do 20% użytkowników, a po sprawdzeniu zwiększyć do 100%. Bezpiecznik na wypadek problemów.
- **Wniosek o produkcję składasz tylko raz** — kolejne aktualizacje go nie wymagają.

---

## Częste problemy (i co dzisiaj nas zaskoczyło)

| Komunikat / objaw | Przyczyna | Rozwiązanie |
|---|---|---|
| „Kod wersji X jest już w użyciu" | Nie podbiłeś `versionCode` | Zwiększ `versionCode` w `app.json` o 1 i zbuduj ponownie |
| Link do AAB nie działa (`NoSuchKey`) | Plik wygasł po 30 dniach | Zbuduj ponownie i pobierz tego samego dnia |
| Build pada po ~50 s w fazie „Prebuild" | Skasowany lokalnie plik graficzny, do którego odwołuje się `app.json` (np. `assets/splash.png`) | Sprawdź, czy pliki z `app.json` istnieją; przywróć z gita: `git restore <plik>` |
| Zgłaszanie builda wisi (kilkadziesiąt minut) | Krok „Computing project fingerprint" | Buduj z `EAS_SKIP_AUTO_FINGERPRINT=1` |
| Ostrzeżenie o „pliku do odczytywania zaciemnionego kodu" | Brak pliku mapującego (R8/ProGuard) | Opcjonalne, nie blokuje — można zignorować |

---

## Sprawdzenie błędu builda

Jeśli build ma status `errored`, dokładny komunikat zobaczysz tak:
```bash
npx eas-cli build:view <BUILD_ID> --json
```
Szukaj pola `error.message` — zwykła wersja widoku tego nie pokazuje.
