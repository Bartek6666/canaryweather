# Checklista Play Console — wydanie „Sunly" 1.5.0

Krok po kroku, co i KIEDY klikać w Google Play Console. Kolejność ma znaczenie
(patrz uzasadnienie na końcu). Treści do wklejenia są w:
- Tytuł + opisy: `docs/store-listing-1.5.0.md`
- Release notes („Co nowego"): `docs/release-notes-1.5.0.md`

Języki wszędzie te same: **en-GB, pl-PL, es-ES, de-DE**.

---

## FAZA 0 — TERAZ (build 1.5.0 vc8 w weryfikacji na teście zamkniętym)

- [ ] **NIE zmieniaj tytułu ani opisu** dopóki trwa sprawdzanie testu zamkniętego.
- [ ] Sprawdź status: **Test i publikacja → Testowanie → Testy zamknięte**
      (Test and release → Testing → Closed testing). Poczekaj na status
      „Dostępne dla testerów" / „Available to testers" (= zaakceptowane).

> Dlaczego czekać: zmiana strony w sklepie w trakcie trwającej weryfikacji może
> ją opóźnić, a Play Console i tak potrafi zablokować zapis do czasu jej końca.

---

## FAZA 1 — PO AKCEPTACJI TESTU (w trakcie 14 dni testów)

### 1a. Zmiana tytułu + opisów (Main store listing)

Ścieżka: **Rośnij / Grow → Obecność w Sklepie → Główna strona w Sklepie**
(Grow → Store presence → Main store listing).

Uwaga: język wybierasz z listy rozwijanej u góry strony i **powtarzasz to samo
dla każdego z 4 języków osobno**.

Dla KAŻDEGO języka (en-GB, pl-PL, es-ES, de-DE):
- [ ] **App name / Nazwa aplikacji** → wpisz `Sunly` (było „Canary Weather")
- [ ] **Short description / Krótki opis** → wklej krótki opis z `store-listing-1.5.0.md`
- [ ] **Full description / Pełny opis** → wklej pełny opis (z sekcją 📌 Źródła
      danych + ⚠️ Disclaimer — NIE usuwać)
- [ ] Sprawdź, że link AEMET `https://www.aemet.es/` jest w pełnym opisie

Po uzupełnieniu wszystkich 4 języków:
- [ ] Kliknij **Zapisz / Save**, potem **Wyślij do sprawdzenia / Send for review**
- [ ] Poczekaj na zatwierdzenie zmiany strony w sklepie (zwykle 1–3 dni,
      weryfikowane osobno od buildu)

### 1b. (Opcjonalnie) grafiki i zrzuty pod „Sunly"

- [ ] Jeśli ikona/feature graphic/zrzuty ekranu mają jeszcze starą markę —
      podmień je na tej samej stronie (sekcja Graphics / Grafika). Nowa ikona
      pojawia się dopiero z buildem EAS, ale grafiki w sklepie są niezależne.

---

## FAZA 2 — PO 14 DNIACH TESTÓW (wniosek o produkcję)

Warunek z poprzedniej odmowy (29.06): realne zaangażowanie testerów przez 14 dni.

- [ ] Upewnij się, że strona w sklepie „Sunly" (Faza 1) jest już **zatwierdzona**
- [ ] **Test i publikacja → Produkcja → Utwórz nowe wydanie**
      (Test and release → Production → Create new release)
- [ ] Dodaj build (ten sam AAB 1.5.0 vc8 z testu — **UWAGA: AAB wygasa po
      30 dniach od zbudowania**; jeśli minęło, trzeba przebudować w EAS)
- [ ] **Release notes / Co nowego** → wklej z `release-notes-1.5.0.md` dla
      każdego z 4 języków (≤500 znaków / język)
- [ ] Kliknij **Zapisz → Sprawdź wydanie → Rozpocznij wdrażanie do produkcji**
      (Save → Review release → Start rollout to production)
- [ ] Wyślij wniosek o weryfikację produkcyjną

---

## Dlaczego taka kolejność

1. Strona w sklepie (tytuł + opis) musi być kompletna i zgodna z polityką
   **zanim** złożysz wniosek o produkcję — bo wtedy Google sprawdza właśnie ją.
   Dwie poprzednie odmowy dotyczyły treści (Misleading Claims: brak atrybucji
   AEMET + disclaimera). Nowy opis ma oba elementy.
2. Robienie zmian w trakcie trwającej weryfikacji testu = ryzyko opóźnienia.
   Stąd Faza 0 = tylko czekać.
3. Release notes są per-wydanie, więc wchodzą dopiero przy tworzeniu wydania
   produkcyjnego (Faza 2), nie przy zmianie strony w sklepie.
