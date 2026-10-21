# Morze

Port aktywnej części `mod_morza.xml`. Moduł jest domyślnie włączony; `mr-`
wyłącza triggery i zatrzymuje automat, `mr+` włącza go ponownie.

| Alias | Działanie |
| --- | --- |
| `nur! N` | Zanurzanie do podanej głębokości, potem `sig Dno!`. |
| `nurek!` | Zanurzanie do głębokości 3, osiem przeszukań dna, wynurzenie. |
| `wyp!` | Anuluje oczekujące komendy i płynie w górę aż do komunikatu wynurzenia. |
| `wodor! kierunek` | Bierze wodorosty, płynie w podanym kierunku, ponawia po przepłynięciu. |
| `wrak!` | Osiem razy `szukaj wraku`. |
| `per4`, `per8` | Cztery lub osiem razy `przeszukaj dno`. |
| `per! kierunek` | Ruch, odczekanie, pięć przeszukań dna. |
| `perly!` | `dobs`, pięć razy otwarcie muszli / wyjęcie perły / `wlz muszle`, `opus`. |
| `nurk kierunek` | Trzy ruchy w dół, `sp`, pięć przeszukań, ruch, pięć przeszukań, trzy ruchy w górę. |
| `bur!` | Ruch po trasie mapy i cztery przeszukania na każdym kroku. |
| `bur!!` | Kontynuacja; gdy pętla nie jest aktywna, wykonuje tylko jeden krok. |
| `qu` | Anuluje wszystkie komendy modułu i wysyła `sig Quit done!`. |

`wrak!` i `per8` wynurzają po zakończeniu, jeżeli aktywny jest tryb `nurek!`.
Opóźnienia i kolejność komend pochodzą z XML. Wykrywanie `sa_wodo` jest
jednorazowe: uzbraja je `nurk`, pierwszy pasujący tekst rozbraja je, jak w XML.

## Integracja z klientem

- Zewnętrzna zmienna CMud `next_dir` została zastąpiona kolejnym krokiem
  oznaczonej trasy (`mapPath`). Po załadowaniu modułu wyznacz trasę, np.
  `/prowadz <id>`, a następnie użyj `bur!`. Po przeładowaniu pluginu wyznacz
  trasę ponownie. Nie uruchamiaj równocześnie automatycznego walkera.
- Powiadomienia `#MESSAGE` są drukowane lokalnie i pokazywane jako powiadomienia
  przeglądarki, jeśli udzielono już uprawnienia. `sig` pozostaje komendą gry;
  `#SAY` jest wyłącznie lokalnym tekstem.
- `play_tink` i `play_basso` korzystają z pluginu Sounds. Nie ma źródłowego
  `goodies.wav`; jego zamiennikiem przy bursztynie jest `play_ding`.
- Wyłączona klasa `archive` pozostaje nieaktywna. Nieokreślone w XML `@wodor`
  przy krytycznym braku powietrza oznacza tutaj tryb `wodorosty`.

## Zatrzymywanie

`qu`, `wyp!`, `mr-`, `prr`, rozłączenie i unload anulują oczekujące timery.
Nowa sekwencja zastępuje poprzednią. `qu` nie zeruje znanej głębokości — robi to
dopiero komunikat wynurzenia. Automat bursztynów zatrzymuje się także wtedy,
gdy po cyklu przeszukań mapa nadal pokazuje lokację sprzed ruchu.

Testy zachowania: `test/plugins/core-plugin/morze.test.ts`.
