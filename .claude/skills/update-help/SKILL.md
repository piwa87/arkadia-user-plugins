---
name: update-help
description: 'Audit and sync the ?alias help catalog in core-plugin/help.ts against the aliases actually registered across core-plugin. Use when you have added, removed, or renamed aliases and want to keep the help output accurate.'
---

# Update Help Alias Catalog

The `?alias` command is powered by the static `rows` array in
`src/plugins/core-plugin/help.ts`. It must be kept in sync manually whenever
aliases in `core-plugin` change.

> There is no longer a separate `?devhelp` catalog — the development plugin's
> help was removed. `core-plugin/help.ts` is the single source of truth.

## Files involved

| File | Role |
|------|------|
| `src/plugins/core-plugin/help.ts` | The catalog to update — edit the `rows` array here |
| `src/plugins/core-plugin/**/*.ts` | Source of truth for what aliases actually exist |

Alias files live at the `core-plugin/` root and in subdirectories (no `aliases/`
folder anymore). Key locations:

| File | Typical content |
|------|----------------|
| `walka/walka_aliasy.ts` | z, z1–z4, c, c1–c4, set, set1–set4, dp |
| `walka/walka_zaslony.ts` | Party shield grid (qq…pp, `<key>w/x/z`) |
| `pyk.ts` | pyk+, pyk- (auto-attack leader target) |
| `exp_bindy.ts` | b* target presets, next! |
| `f.ts` | Functional bind (f+, f+!, f, f-) |
| `doo.ts` | Multibind (doo, doo2–4, doo+, doo-) |
| `dobywanie/dobywanie_aliases.ts` | Weapon draw/sheathe, shield swap, armor toggle |
| `equipment.ts` | Bag management, item inspection, wearing gear, looting |
| `loot.ts` | w1–w20, m1–m20, b1–b20, ww0, mx |
| `buklak.ts` | Flask/cup commands |
| `ziola.ts` | Herb aliases (zi, zii, zx, obz, obz!, zisort!, mana+, st+, zm+) |
| `jens/palenie.ts` | Smoking (smoke, smokec, cyg, tytind, tytud, skod) |
| `jens/emotes.ts` | Emote text aliases |
| `mieszek.ts` | Coin purse aliases |
| `lampa.ts` | Lamp aliases |
| `poczta.ts` | Mail/post aliases |
| `travel/travel_aliases.ts`, `travel/wsiadacz.ts` | Boarding/disembark aliases |
| `stats.ts` | stat, stat2, pos, pos2 |
| `team.ts` | ps, ws, pd, xx, xp and similar team commands |
| `kondycje/kondycje_aliases.ts` | k, hp+, hp- |
| `options.ts` | opa, przyjm, op1–3, opi, res — option toggles |
| `map.ts` | col0–col3, ?hl |
| `tmpk/tmpk.ts` | Mob name highlight list |
| `mgfn.ts` | Megaphone print |
| `karczma.ts` | siad |
| `bramy.ts` | br, br2 (gate aliases) |
| `misc.ts` | maketemp, szuk!, and other one-off helpers |
| `locations.ts` | Location-specific shortcuts |
| `debug.ts` | Debug-only — do NOT add to help |
| `zaslony.ts` | `zas!` /fake test alias — do NOT add to help |

## Step-by-step audit

### 1. Read the current catalog

Read `src/plugins/core-plugin/help.ts` in full. Note every `{ cmd, desc }`
entry and which `{ section }` it belongs to.

### 2. Read all alias source files

Read every `*.ts` under `src/plugins/core-plugin/` that calls
`api.aliases.register`. A quick way to enumerate them:

```bash
grep -rl "aliases.register" src/plugins/core-plugin --include="*.ts"
```

For each registration, extract:
- The alias pattern (regex or string passed to `api.aliases.register`)
- What the alias does (from the comment or the command(s) it sends)

### 3. Compare and identify gaps

For each alias found in step 2, check if it appears in the `rows` array:
- **Missing**: alias exists in code but not in help → add an entry
- **Stale**: entry in help but alias no longer exists → remove the entry
- **Wrong description**: alias changed behaviour → update `desc`

**What to include in help**: aliases a player would type during normal gameplay.
**What to omit**: internal/debug aliases (`debug.ts`, `?map`, `?gmcp`), `/fake`
test aliases (`zas!`, `kon!`, `ake`, `test-arrival`), `rp!` (reload-plugins),
and trivial text-emote pass-throughs (those are summarized in one EMOTES row).
Location-specific shortcuts (`locations.ts`) are included under a LOCATIONS
section in the current catalog.

### 4. Edit the `rows` array

In `src/plugins/core-plugin/help.ts`, update the `rows` array.

- It is a flat list of `HelpEntry`: either `{ section: string }` (a header)
  or `{ cmd: string; desc: string }` (an alias row).
- Keep section groupings logical (COMBAT, LOOT, EQUIPMENT / BAGS, HERBS, etc.).
- `cmd` field: the alias as the player types it, e.g. `'w1–w20'`, `'stat'`,
  `'f+ <cmd>'`. Combine close variants on one row (e.g. `'buk+ / buk-'`).
- `desc` field: one short phrase (English, matching the existing entries).
- Column widths and borders are computed automatically from the longest `cmd`
  and `desc`, so no manual alignment is needed.

### 5. Verify

Run `yarn typecheck` to confirm no type errors. No tests needed for a
catalog-only change.
