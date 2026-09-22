# Dawny walker ZC/Pustkowia

Ten dokument zachowuje opis ręcznego walkera, którego wcześniej używały trolle. Implementacja działała w `src/plugins/core-plugin/movement/walker.ts` przed przejściem na walker klienta. Pełny kod wraz z testami można odzyskać z rewizji `a9c415d9109cc69c0f7d24160bb2a213474b05ec`:

```bash
git show a9c415d9109cc69c0f7d24160bb2a213474b05ec:src/plugins/core-plugin/movement/walker.ts
git show a9c415d9109cc69c0f7d24160bb2a213474b05ec:test/plugins/core-plugin/walker.test.ts
```

## Interfejs dawnego rozwiązania

- `/zcwalk <roomId>` ustawiał cel bez ruszania postaci.
- `step!` wykonywał jeden krok w stronę celu.
- `step!!` uruchamiał automatyczne kroki co 500 ms po potwierdzeniu ruchu.
- `/zcstop` usuwał cel.
- Wewnętrzne zdarzenie `dynamicWalker.start` przyjmowało `{ roomId, label, automatic }`. Po dojściu emitowane było `dynamicWalker.arrived` z `{ roomId }`.
- Kliknięcie ID trolla ustawiało ręczny cel; kliknięcie dystansu uruchamiało automat.

## Jak wybierał krok

1. Pobierał obecną lokację i cel z mapy. `api.map.findPath` podawało trasę oraz preferowany kierunek pierwszego kroku.
2. Czytał aktualnie otwarte wyjścia z `gmcp.room.info.exits`. Wyjątki mapy: w pokoju `20841` północ, w `20842` południe były dopisywane jako ukryte otwarte wyjścia.
3. Jeśli preferowane wyjście było otwarte, wysyłał jego skrót (`n`, `e`, `sw` itd.). Obsługiwał też `specialExits` z mapy.
4. Jeśli preferowane wyjście było zamknięte, wybierał inne otwarte wyjście znane mapie. Najpierw porównywał kąt kierunku z preferowanym, a przy remisie odległość współrzędnych od celu. Dzięki temu obchodził przeszkody, ale mógł też wejść w pętlę.
5. Czekał do 5 sekund na zmianę pokoju potwierdzoną zdarzeniem `gmcp.room.info`. Bez potwierdzenia wstrzymywał automat, pozostawiając cel. Wykrywał i zatrzymywał powtarzanie dwóch pokoi w układzie A-B-A-B-A.

Walker wysyłał zwykłe komendy ruchu do gry i drukował wybrany kierunek jako `--> e` albo alternatywę jako `--> n (e)`. Po dojściu drukował `[zc] dotarto...`, wysyłał powiadomienie i zdarzenie przyjścia. Ustawienie nowego celu zatrzymywało walker klienta przez `walker.stop`.

## Stan obecny i ewentualny powrót

Obecnie `tro!`, kliknięcie dystansu w `tro`/`trow` i `wk` korzystają z walkera klienta. Kliknięcie ID trolla ustawia cel przez `/prowadz <ID>`. Ręczne aliasy `/zcwalk`, `step!`, `step!!` i `/zcstop` nie są rejestrowane. Komenda `/walk` należy do klienta i w obszarach ZC/Pustkowia przełącza jego wyszukiwanie alternatywnych wyjść na czas przejścia.

Przy przywracaniu starego algorytmu warto wydzielić go do osobnego modułu, przywrócić testy kroków z podanej rewizji i zdecydować, które akcje mają go uruchamiać. Nie należy jednocześnie prowadzić postaci dwoma automatami: dawny `startZcWalking` zatrzymywał walker klienta właśnie z tego powodu.
