---
name: update-help
description: 'Audit and sync the ?devhelp alias catalog in development-plugin/help.ts against the actual aliases registered in core-plugin/aliases/. Use when you have added, removed, or renamed aliases and want to keep the help output accurate.'
---

# Update Help Alias Catalog

The `?devhelp` command is powered by the static `HELP_SECTIONS` array in
`src/plugins/development-plugin/help.ts`. It must be kept in sync manually
whenever aliases in `core-plugin` change.

## Files involved

| File | Role |
|------|------|
| `src/plugins/development-plugin/help.ts` | The catalog to update — edit `HELP_SECTIONS` here |
| `src/plugins/core-plugin/aliases/*.ts` | Source of truth for what aliases actually exist |
| `src/plugins/core-plugin/aliases/help.ts` | Core-plugin's own `?help` alias (separate from devhelp) |

## Step-by-step audit

### 1. Read the current catalog

Read `src/plugins/development-plugin/help.ts` in full. Note every `{ syntax, desc }` entry and which section it belongs to.

### 2. Read all alias source files

Read every file in `src/plugins/core-plugin/aliases/`. For each file, extract:
- The alias pattern (regex or string passed to `api.aliases.register`)
- What the alias does (from the comment or the command it sends)

Key files and what they cover:

| File | Typical content |
|------|----------------|
| `equipment.ts` | Bag management, item inspection, wearing gear |
| `exp_bindy.ts` | Experience/progress binds |
| `f.ts` | Functional bind (f+, f-, f) |
| `loot.ts` | w1–w20, m1–m20, b1–b20, mx, mz, ww0 |
| `misc.ts` | maketemp, szuk!, na_statek and other one-off helpers |
| `stats.ts` | stat, stat2, pos, pos2 |
| `locations.ts` | Location-specific shortcuts (usually not in help) |
| `map.ts` | col0–col3, ?hl |
| `team.ts` | ps, ws, pd, xx, xp and similar team commands |
| `options.ts` | opa, przyjm, op, opi, res — option toggles |
| `buklak.ts` | Buklak/flask commands |
| `mgfn.ts` | Magic/function aliases |
| `mieszek.ts` | Coin purse aliases |
| `lampa.ts` | Lamp aliases |
| `poczta.ts` | Mail/post aliases |
| `debug.ts` | Debug-only — do NOT add to help |

Also check `src/plugins/development-plugin/`:
- `devAlias.ts`, `combat.ts`, `movement.ts`, `misc.ts` — dev-plugin aliases that may also need help entries

### 3. Compare and identify gaps

For each alias found in step 2, check if it appears in `HELP_SECTIONS`:
- **Missing**: alias exists in code but not in help → add an entry
- **Stale**: entry in help but alias no longer exists → remove the entry
- **Wrong description**: alias changed behaviour → update `desc`

**What to include in help**: aliases that a player would type during normal gameplay.
**What to omit**: internal/debug aliases (`debug.ts`), very location-specific shortcuts (`locations.ts` entries like `xblav`, `kigge`), and aliases that are self-explanatory one-liners not worth documenting.

### 4. Edit HELP_SECTIONS

In `src/plugins/development-plugin/help.ts`, update the `HELP_SECTIONS` array.

- Keep section groupings logical (Walka, Grabież, Statystyki, Zioła, etc.)
- `syntax` field: use the alias name as the player types it, e.g. `'w1–w8'`, `'stat'`, `'f+ <cmd>'`
- `desc` field: one short Polish phrase describing what it does
- If adding a new section, follow the `{ title: string, entries: Entry[] }` shape

### 5. Verify

Run `yarn typecheck` to confirm no type errors. No tests needed for a catalog-only change.
