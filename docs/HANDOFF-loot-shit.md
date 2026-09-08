# Handoff: loot-shit

## Cel

Plugin do zarządzania lootem z mobów — aliasy do zbierania i sprzedawania przedmiotów z mobów podzielonych na grupy (ork, goblin, campo, has).

## Lokalizacja

`src/plugins/core-plugin/loot-shit.ts`
Wpięcie w `src/plugins/core-plugin/index.ts` — `setupLootShitAliases(api)` linia 202.

## Obecne grupy

| Grupa | key | Itemów | Aliases take | Aliases sell |
|---|---|---|---|---|
| Ork | `ork` | 18 | `wezork`, `wez ork` | `spork`, `sp ork` |
| Goblin | `gob` | 6 | `wezgob`, `wez gob` | `spgob`, `sp gob` |
| Campo | `cam` | 11 | `wezcam`, `wez cam` | `spcam`, `sp cam` |
| Has | `has` | **1 (placeholder!)** | `wezhas`, `wez has` | `sphas`, `sp has` |

Dodatkowe aliasy:
- `sall` — to samo co `sp <grupa>` (4-cyklowa sekwencja sell)
- `groups` — wyświetla listę grup z aliasami i liczbą itemów

## Standardowe sekwencje

### Take (`wezork`, `wezgob`, `wezcam`, `wezhas`, `wez <key>`)

```
ww0                         → strip weapons+armor z 8 ciał (alias z src/plugins/core-plugin/loot.ts)
wez <item1> (cicho, echo=false)
wez <item2> (cicho)
...
napt                        → otworz + napelnij zalozony pojemnik (alias z worn_container.ts)
```

### Sell (`spork`, `spgob`, `spcam`, `sphas`, `sp <key>`, `sall`)

4 cykle z 1s cooldown między nimi, każdy cykl:
```
napt
wyj bronie / wyjzb (alternating: bronie, zb, bronie, zb)
sprzedaj je
```

Zależności (aliasy zdefiniowane w innych plikach pluginu):
- `ww0` — `src/plugins/core-plugin/loot.ts`
- `napt` — `src/plugins/core-plugin/worn_container.ts` (per-character: `zalozona torba` / `zalozony plecak`)
- `wyjzb` — `src/plugins/core-plugin/equipment.ts` (→ `wyj wszystkie zbroje`)
- `wyj bronie`, `sprzedaj je` — aliasy character-specific (nie w repo, zdefiniowane w grze lub brak)

## Stan obecny

- [x] STR_SHIT (strzyga) — usunięty wraz z grupą i `storeStr`/`strned`
- [x] Standardowe sekwencje take i sell — zaimplementowane
- [x] Aliasy przemianowane na `wez<key>` / `sp<key>`
- [x] `campo` → `cam` (klucz zmieniony)
- [ ] **HAS_SHIT — placeholder!** Obecnie `['bla bla kolczugi']` — trzeba zastąpić realną listą itemów
- [ ] `wyj bronie` i `sprzedaj je` — to są aliasy zdefiniowane w grze lub character-specific. Jeśli nie istnieją, sekwencja sell nie zadziała. Trzeba zweryfikować.
- [ ] Potencjalnie: dodać `has` do `groups` help? (help.ts jest osobnym plikiem)

## Architektura

- Czyste aliasy, zero triggerów — auto-czyszczone na unload, nie trzeba `destroy()` cleanup
- `sellSequence` jest async z `await delay(1000)` między cyklami — to jedyny async kod w pliku
- `api.command.send(komenda, false)` — ciche komendy (nie pokazywane w output)
- Każda grupa ma osobny callback take (np. `takeOrk`), ale sell wszystkie wołają `sellSequence(api)` — to samo dla każdej grupy
- `takSequence(api, items)` — generyczne, bierze listę itemów

## TODO na przyszłość

1. **Uzupełnić `HAS_SHIT`** — realna lista przedmiotów
2. **Zweryfikować aliasy zależne** — `wyj bronie`, `sprzedaj je` — czy istnieją i działają
3. Możliwość dodania kolejnych grup (orchidea, inne)
4. Potencjalnie: `sellSequence` powinna brać grupę itemów i wyciągać/wyjmować/sprzedawać konkretne itemy (jak stare `sprzedajWszystkie`), ale obecnie operuje na zawartości pojemnika przez `napt → wyj */sprzedaj je`