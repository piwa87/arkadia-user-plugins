# Raport brakującej wiedzy

## Cel i obecny stan

Core-plugin buduje raport nieukończonych wpisów wiedzy dla aktualnej postaci. Raport jest wzbogacany o domenę, ID pokoju, nazwę lokalizacji i notatkę z hostowanego `knowledge.json`.

Gotowe elementy:

1. `src/data/knowledge.json` jest kopiowany przez build do `dist/data/knowledge.json`.
2. Plik jest dostępny jako `http://localhost:3030/data/knowledge.json` w developmencie oraz pod analogiczną ścieżką na GitHub Pages.
3. Core-plugin pobiera plik przez `fetch(new URL("data/knowledge.json", import.meta.url))`, bez adresu hosta wpisanego na sztywno.
4. Plugin odbiera `knowledgeDetailsReport` i łączy brakujące wpisy ze statycznymi danymi.
5. Dane raportu są dostępne dla kolejnych modułów core-pluginu przez funkcje z `knowledge/report-data.ts`.
6. Alias `wiedza20` pokazuje tekstową listę maksymalnie 20 najbliższych, osiągalnych wpisów w aktualnej domenie GMCP.

Do zrobienia później:

- graficzne okno raportu,
- klikalne prowadzenie do pokoju i pokazanie go na mapie,
- ewentualne filtry kategorii i rodzaju wiedzy.

## Pliki implementacji w arkadia-user-plugins

- `src/plugins/core-plugin/knowledge/report-data.ts` — ładowanie JSON-a, odbiór eventów, łączenie i przechowywanie raportu.
- `src/plugins/core-plugin/knowledge/nearest-alias.ts` — ranking tras i alias `wiedza20`.
- `src/data/knowledge.json` — źródłowy statyczny zestaw danych.
- `scripts/lib.mjs` — kopiowanie `src/data` do `dist/data`.
- `src/plugins/core-plugin/index.ts` — inicjalizacja i cleanup warstwy raportu.
- `src/plugins/core-plugin/modules.ts` — eksport funkcji raportu i konfiguratora aliasu.
- `test/plugins/core-plugin/knowledge-report-data.test.ts` — testy łączenia danych oraz eventów.
- `test/plugins/core-plugin/knowledge-nearest-alias.test.ts` — testy domen i rankingu odległości.

## Jak klient zbiera wiedzę

Alias `/wiedza_buduj` jest obsługiwany w `src/client/scripts/knowledge.ts`. Klient wysyła do gry sekwencję komend i tymczasowo rejestruje triggery rozpoznające:

- kategorię po linii `Wiedza o ...`,
- podsumowanie rodzaju wiedzy,
- sekcje walki, książek i eksploracji,
- wpisy zaczynające się od `*`.

Odebrane wpisy są porównywane ze znanymi definicjami. Dopasowane trafiają do `knownEntries`, a nierozpoznane do `unknownEntries`. Wynik jest zapisywany przez `getKnowledgeDetailsStore().applyLocalChange(...)`.

Definicje są pobierane przez `wiedzaStore` z:

```text
https://ethel.pl/wp-admin/admin-ajax.php?action=wiedza_data
```

## IndexedDB

Baza szczegółowej wiedzy nazywa się:

```text
ArkadiaKnowledgeDetailsDBv2
```

Object stores:

| Store | Zawartość |
|---|---|
| `knowledge_definitions` | Wszystkie znane definicje wpisów wiedzy |
| `knowledge_entries` | Ukończone wpisy poszczególnych postaci |
| `knowledge_progress` | Poziomy wiedzy i nierozpoznane wpisy |
| `knowledge_characters` | Metadane postaci, m.in. płeć |
| `knowledge_metadata` | Metadane odświeżania |

Pojedynczy rekord w `knowledge_entries` zawiera m.in.:

```json
{
  "id": "Gertruda::goblinoidach::exploration::widziales lodowego trolla",
  "character": "Gertruda",
  "category": "goblinoidach",
  "type": "exploration",
  "canonical": "Widziales lodowego trolla",
  "updatedAt": 0
}
```

Brakujące wpisy obliczamy jako:

```text
knowledge_definitions
MINUS
knowledge_entries dla wybranej postaci
```

Kluczem porównania jest zestaw:

```text
kategoria + typ + znormalizowana nazwa wpisu
```

Normalizacja wykonywana przez klienta obejmuje trimowanie, zamianę na małe litery, redukcję białych znaków, usunięcie końcowej interpunkcji i usunięcie polskich znaków.

## Skąd pochodzą ID i lokalizacje

IndexedDB nie przechowuje przy wpisie pól:

- `Domena`,
- `id` lokacji,
- `lokalizacja`,
- `note`.

Pola te znajdują się w `src/client/knowledge.json`. Przykładowy rekord:

```json
{
  "Rodzaj": "Wiedza o goblinoidach",
  "Wiedza": "Widziales lodowego trolla",
  "id": 19517,
  "Domena": "Ishtar",
  "lokalizacja": "Mahakam - Lodowe Trolle",
  "note": "\"ob trolla\""
}
```

Wbudowany klient tworzy lookup indeksowany znormalizowaną wartością `Wiedza`. Podczas budowania `knowledgeDetailsReport` wzbogaca każdy wpis o `id`, `lokalizacja` i `note`.

Pole `Domena` nie jest obecnie przekazywane w payloadzie raportu. Dlatego własny raport domenowy musi mieć dostęp do `knowledge.json` albo klient musi zostać rozszerzony o `domena` w payloadzie.

## Publiczne API pluginu

Plugin może korzystać z eventów klienta:

```ts
api.events.on("knowledgeDetailsReport", handler);
api.events.emit("requestKnowledgeDetailsReport");
```

`knowledgeDetailsReport` zawiera kategorie i rodzaje wiedzy, a każdy wpis ma strukturę zbliżoną do:

```ts
type KnowledgeDetailsReportEntry = {
  name: string;
  status: "known" | "missing";
  id?: number | null;
  lokalizacja?: string;
  note?: string;
};
```

W bieżącym `plugin-types/index.d.ts` typ `knowledgeDetailsReport` jest zadeklarowany jako `unknown | null`. Event `requestKnowledgeDetailsReport` istnieje w źródłowym `ClientEvents`, ale wygenerowane typy pluginu mogą być nieaktualne. Do czasu regeneracji typów może być potrzebne lokalne rzutowanie `api.events`.

Najlepszy wariant pluginu nie czyta IndexedDB bezpośrednio. Prosi klienta o gotowy raport, następnie uzupełnia pole `Domena` ze swojej kopii `knowledge.json`.

## Algorytm budowania raportu

1. Przy inicjalizacji core-pluginu zarejestruj listenery `knowledgeDetailsReport` i `knowledgeDetailsUpdated`.
2. Pobierz hostowany `data/knowledge.json` względem `import.meta.url` pluginu.
3. Wyemituj `requestKnowledgeDetailsReport`.
4. Spłaszcz `categories[].types[].entries` otrzymanego raportu.
5. Zostaw wpisy z `status === "missing"` oraz niepustym `id`.
6. Zamień formy żeńskie na kanoniczne formy męskie, np. `Widzialas` na `Widziales`.
7. Połącz wpisy z `knowledge.json` po znormalizowanym polu `Wiedza`.
8. Zapisz wynik w pamięci modułu i powiadom subskrybentów.

Warstwa danych eksportuje:

```ts
getKnowledgeReportState()
getMissingKnowledgeEntries(options)
subscribeKnowledgeReport(listener)
setupKnowledgeReportData(api)
```

Stan ma jedną z wartości `loading`, `ready` albo `error`. Po poprawnym zbudowaniu zawiera nazwę postaci, czas aktualizacji oraz tablicę `MissingKnowledgeEntry`.

## Alias `wiedza20`

Alias działa bez argumentów:

```text
wiedza20
```

Przebieg:

1. Pobiera aktualny pokój przez `api.map.getRoom()`.
2. Pobiera domenę przez `api.gmcp.get().room.info.map.domain`.
3. Filtruje brakujące wpisy do aktualnej domeny.
4. Dla każdego unikalnego ID pokoju wywołuje `api.map.findPath(currentRoomId, targetRoomId)`.
5. Odległość wylicza jako `path.length - 1`.
6. Pomija wpisy, do których mapa nie znajduje trasy.
7. Sortuje osiągalne wpisy po odległości, lokalizacji, ID i nazwie.
8. Wyświetla pierwsze 20 pozycji jako zwykły tekst.

Wpisy `Ishtar/Imperium` są uznawane za pasujące zarówno do `Ishtar`, jak i `Imperium`. Wartość GMCP `Empire` jest normalizowana do `Imperium`.

Przykładowy wynik:

```text
[Wiedza] 20 najblizszych brakujacych wpisow — Imperium (z #12345):
1. [12] #27011 | Zamek Drachenfels | Widziales orcza forme ... | Gdy Konstant go przyzwie obejrzyj go.
```

Aktualny rekord raportu:

```ts
type MissingKnowledgeEntry = {
  character: string;
  domain: string;
  category: string;
  type: "fight" | "books" | "exploration";
  name: string;
  id: number;
  location: string;
  note: string;
};
```

## Istotne przypadki brzegowe

- Dla postaci kobiecej klient może wyświetlić np. `Widzialas`, podczas gdy `knowledge.json` zawiera `Widziales`. Implementacja kanonizuje znane formy zależne od płci przed wykonaniem lookupu.
- Kilka wpisów może wskazywać to samo ID lokacji. Nie należy deduplikować wyłącznie po `id`.
- Lookup pluginu przechowuje tablicę rekordów dla każdej znormalizowanej nazwy.
- Wbudowany raport klienta pomija wpis `Usuniete`, zanim payload trafi do pluginu.
- Lokalny serwer ustawia `Access-Control-Allow-Origin: *`, dzięki czemu klient HTTPS może pobrać JSON, o ile przeglądarka nie zablokuje samego mixed content HTTP.
- Przed generowaniem raportu postać powinna wykonać `/wiedza_buduj`, aby IndexedDB zawierało aktualny postęp.
- Odległość jest długością trasy mapowej, a nie odległością geometryczną między współrzędnymi.
- Odległość dla kilku wpisów w tym samym pokoju jest liczona tylko raz i pobierana z cache pojedynczego wywołania aliasu.

## Ostatnia weryfikacja

Po wdrożeniu warstwy danych i aliasu wykonano:

```text
yarn typecheck — OK
yarn build     — OK
yarn test      — 489/489 testów
```

Potwierdzono również, że `dist/data/knowledge.json` jest bajtowo identyczny z `src/data/knowledge.json`.

## Pliki referencyjne klienta Arkadii

- `src/modules/data/dataStores/knowledgeDetailsStore.ts` — schemat i obsługa IndexedDB.
- `src/modules/data/dataStores/wiedzaStore.ts` — pobieranie i przetwarzanie definicji.
- `src/client/scripts/wiedzaLoader.ts` — ładowanie definicji z cache/API.
- `src/client/scripts/knowledge.ts` — parsowanie raportu, obliczanie braków i łączenie z `knowledge.json`.
- `src/client/knowledge.json` — pierwotne źródło domen, ID, lokalizacji i notatek; kopia używana przez plugin znajduje się w `arkadia-user-plugins/src/data/knowledge.json`.
- `src/web/KnowledgeDetailsReport.tsx` — wbudowane okno raportu.
- `plugin-types/README.md` oraz `plugin-types/index.d.ts` — publiczne API pluginów.
