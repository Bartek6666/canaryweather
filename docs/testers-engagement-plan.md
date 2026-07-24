# Plan zaangażowania testerów — Sunly (2. podejście do produkcji)

**Kontekst:** 2. odmowa dostępu do produkcji (2026-07-22), ten sam powód: za małe zaangażowanie
testerów + niewidoczna pętla „opinie → poprawki". Testerzy zainstalowali apkę z Play, ale otwierają
ją zbyt rzadko. Google wymaga **kolejnych 14 dni** testu zamkniętego (min. 12 testerów), licząc od
2026-07-22. **Apki nie ruszamy — vc9 zostaje na teście.** To problem organizacyjny, nie techniczny.

**Cel:** ~15–20 testerów, którzy **regularnie** (kilka razy w tygodniu) otwierają apkę przez 14 dni
i dają feedback, plus JEDNA aktualizacja (vc10) wypuszczona w reakcji na ich uwagi.

---

## 1. Wiadomość do testerów (gotowa do wysłania — indywidualnie, nie masowo)

> Cześć [imię], mam do Ciebie prośbę na 2 tygodnie 🙏
> Sunly (moja apka pogodowa) jest o krok od publikacji w Google Play — brakuje mi tylko tego, żeby
> testerzy **realnie z niej korzystali** przez najbliższe 14 dni. Google to sprawdza i bez tego nie
> wpuści apki do sklepu.
> Prośba: **otwórz apkę kilka razy w tym tygodniu** (dosłownie 2 minuty za razem) i sprawdź pogodę
> dla różnych miejsc — Twojego wymarzonego wyjazdu, Wysp Kanaryjskich, Balearów. A jak coś Ci nie
> zagra albo masz pomysł — wpisz w formularzu: [LINK DO FORMULARZA].
> Będę Ci ogromnie wdzięczny — to naprawdę robi różnicę. 🌞

**Ważne:** wyślij to **osobiście** do ~15–20 osób (SMS/WhatsApp/Messenger), nie jako jeden masowy
post. Osobista prośba działa wielokrotnie lepiej. Poproś o potwierdzenie „ok, wchodzę".

---

## 2. Kanał koordynacji + drobne zadania (żeby wracali)

Załóż małą grupę (WhatsApp/Messenger) z rdzeniem testerów. Co 2–3 dni wrzuć jedno mini-zadanie —
każde wymaga otwarcia apki. Przykłady na 14 dni:

- Dzień 1: „Sprawdź szansę na słońce dla miejsca, gdzie chcesz jechać na wakacje."
- Dzień 3: „Porównaj dwie wyspy w tym samym miesiącu — która ma więcej słońca?"
- Dzień 5: „Wejdź w szczegóły Wiatr i Opady — czy coś jest niejasne?"
- Dzień 7: „Kliknij rok w «Ostatnie 10 lat» — zobacz wykres temperatur. Podoba się?"
- Dzień 9: „Sprawdź pogodę na żywo dla Las Palmas i powiedz, czy zgadza się z rzeczywistością."
- Dzień 11: „Zobacz nową wersję (vc10) — co się zmieniło? (dam znać, jak wyjdzie)"
- Dzień 13: „Ostatni sprawdzian — cokolwiek jeszcze warto poprawić przed publikacją?"

Cel: rozłożyć otwarcia na cały okres (Google patrzy na powroty w czasie, nie na jeden zryw).

---

## 3. Formularz feedbacku (Google Forms — 4 pytania, krótko)

1. Które miejsca sprawdzałeś w apce? (pole tekstowe)
2. Czy coś nie działało / było mylące? (pole tekstowe)
3. Czego brakuje / co byś dodał? (pole tekstowe)
4. Oceń apkę 1–5 + jedno zdanie dlaczego.

Formularz daje Ci (a) dowód zbierania opinii, (b) materiał do aktualizacji vc10.

---

## 4. Aktualizacja vc10 w trakcie testu (pętla „opinie → poprawki")

Ok. 5.–7. dnia zbierz feedback, wybierz 1–2 rzeczy i wypuść **drobną aktualizację vc10** (bump
1.5.1→1.5.2 / versionCode 9→10). Ogłoś testerom: „dzięki za uwagi, poprawiłem X — zaktualizujcie
i zobaczcie". To robi dwie rzeczy naraz: pokazuje Google reagowanie na feedback ORAZ na nowo
angażuje testerów (aktualizacja = ponowne otwarcie). Ten sam wzorzec co przy vc9.

---

## 5. Harmonogram

- **Dzień 0 (dziś):** rozeslij osobiste wiadomości, załóż grupę, przygotuj formularz.
- **Dni 1–7:** mini-zadania co 2–3 dni, zbieranie feedbacku.
- **~Dzień 7:** wypuść vc10 z poprawką z feedbacku.
- **Dni 7–14:** dalsze zadania, druga fala feedbacku.
- **Po 14 dniach realnego ruchu:** ponowny wniosek o produkcję (z tymi samymi release notes + wzmianką o poprawkach z testu).

**Bramka:** nie składaj wniosku, dopóki nie widać stałego ruchu w statystykach Play Console
(Statystyki → aktywni testerzy). Lepiej 12–15 realnie aktywnych niż 37 „na papierze".

---

## 6. Rekrutacja ZMOTYWOWANYCH testerów (najmocniejsza dźwignia)

Kluczowy wniosek: **osoba realnie planująca wyjazd otworzy apkę wiele razy** — to jest dokładnie to
zaangażowanie, którego szuka Google. Znajomy z grzeczności otworzy raz. Dlatego oprócz obecnych
testerów wpuszczamy nowych, prawdziwie zainteresowanych.

### Gdzie ich znaleźć
- Grupy FB: „Wyspy Kanaryjskie po polsku", Teneryfa/Gran Canaria/Fuerteventura, „Costa del Sol",
  „Majorka/Baleary", grupy emigrantów i planujących zimowanie w cieple.
- Ewentualnie hiszpańskie grupy (wersja ES posta).

### Jak to teraz działa — JEDEN link (dzięki stronie app.sunly.live)
Nie trzeba już grupy Google ani linku opt-in w poście. Cały lejek to strona:
1. Tester wchodzi na **app.sunly.live**, wpisuje swój Gmail w formularzu „Zostań testerem".
2. Ty dostajesz maila (web3forms) z jego adresem.
3. Dodajesz ten Gmail w Play Console → Test zamknięty → zakładka Testerzy.
4. Google wysyła mu link opt-in → instaluje Sunly z Google Play.

### Gotowy post rekrutacyjny (PL)

> 🌞 Szukam kilku osób do przetestowania mojej apki pogodowej **Sunly** (Android)!
>
> Planujesz wyjazd w słońce — Kanary, Baleary, Costa del Sol? Sunly pokazuje **szansę na słońce**
> w danym miejscu i miesiącu, na podstawie 10 lat oficjalnych danych AEMET. Zamiast prognozy na
> jutro — statystyczna pewność na termin Twoich wakacji.
>
> Robię ją sam i jestem o krok od publikacji w Google Play — potrzebuję garstki osób, które
> **przez ~2 tygodnie od czasu do czasu ją otworzą** i powiedzą, co poprawić. W zamian: wczesny
> dostęp i realny wpływ na apkę. 🙌
>
> Jak dołączyć (2 minuty): wejdź na 👉 **app.sunly.live**, wpisz swój adres Gmail — dodam Cię do
> testu i dostaniesz link do instalacji z Google Play.
>
> Z góry wielkie dzięki, każda opinia się liczy! 🌴

### Wersja ES (do grup hiszpańskich)

> 🌞 Busco personas para probar **Sunly** (Android), mi app del tiempo. Muestra la **probabilidad
> de sol** por lugar y mes, con 10 años de datos de AEMET — ideal para planear vacaciones en
> Canarias, Baleares o la Costa del Sol.
>
> La hago yo solo y está a punto de publicarse en Google Play. Necesito unas pocas personas que
> **la abran de vez en cuando durante ~2 semanas** y me digan qué mejorar. A cambio: acceso
> anticipado. 🙌
>
> Cómo unirse (2 min): entra en 👉 **app.sunly.live**, escribe tu Gmail — te añado a la prueba y
> recibirás el enlace de instalación de Google Play. ¡Gracias! 🌴

**Uwaga:** posty w grupach FB często wymagają zgody moderatora — napisz krótko do admina, że to
niekomercyjny test małej, niezależnej apki (nie sprzedaż).
