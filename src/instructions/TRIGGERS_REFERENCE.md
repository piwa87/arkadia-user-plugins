# Triggers Reference

Reference for `api.triggers`, `AnsiAwareBuffer`, and `api.colors` — the core tools for reacting to game output.

---

## RULE #1 — Use `registerTokenGate`, not `api.triggers.register`

**The client tests every `api.triggers.register` pattern against EVERY line of game output** (a linear walk — no indexing). Token triggers (`registerToken`) are bucketed by word and cost ~nothing on lines that don't contain the word. This repo therefore keeps a hard budget on always-on regex triggers, enforced by `test/trigger-budget.test.ts` — **if you add a plain `register()` call, that test will fail.**

Default for any trigger that matches a known phrase:

```typescript
import { registerTokenGate } from '../../lib/registerTokenGate';

// (api, gateWords, pattern, callback, tag)
registerTokenGate(
  api,
  'zdenominowane',                        // gate word(s) — see rules below
  /Twoje pieniadze zostaly zdenominowane\./, // the full pattern, unchanged
  (line) => prependLabel(line, ' DENOMINACJA ', c34),
  TAG,
);
```

The gate registers one indexed token trigger per word and runs `pattern` only on lines containing one of the words. The callback contract is identical to a plain trigger (`line`, `matches` with capture groups, return `line`/modified/`null`).

**Gate word rules:**

- Pick the **rarest word** that appears in *every* line the pattern can match. Lines are tokenized by splitting on spaces and `. , ! ? * ( ) / [ ]` — a gate word must survive that split as a whole token (matching is case-insensitive).
- A pattern with alternations needs gate words covering **every branch** (e.g. closing-gate lines gate on `['zamyka', 'zamykaja', 'zamykajac', 'zamknieta', ...]`).
- Polish inflections are separate tokens — list each form (`['zmeczony', 'zmeczona']`). Tokens are ~free; adding one more is always cheaper than a broad regex.
- If one line can contain several of the gate words, the callback still fires **once** (built-in per-line guard).
- `pattern` may be an array — tried in order, first match wins (use to fold several old triggers with one shared handler into one gate).

**When is plain `api.triggers.register` still correct?** Only when no word is common to all matchable lines — i.e. genuine full-line parsers. Current legitimate uses (7 in the whole repo): kondycje/zmeczenie condition parsers, bramy `^Otwart\w+`/`^Zamkniet\w+` room descriptions, walker's gate matcher. If you think you have an 8th case, anchor it with `^` + a literal prefix and raise the budget in `test/trigger-budget.test.ts` with a comment justifying it.

**Simple word highlighting** doesn't need a gate at all — use `registerToken` directly:

```typescript
api.triggers.registerToken('zloto', (line) =>
  line.colorWords('zloto', gold, { caseInsensitive: true }),
  TAG, { caseInsensitive: true });
```

Always pass `{ caseInsensitive: true }` to `registerToken` — without it a capitalized occurrence (line start) passes the token index but fails the client's second literal check. Multi-word phrases work too (`'czarny ork'` matches consecutive tokens).

---

## Trigger Callback Signature

```typescript
type TriggerCallback = (
  line: AnsiAwareBuffer,   // the current output line (mutable)
  matches: RegExpMatchArray, // regex match result (index 0 = full match, 1+ = groups)
  type: string,             // line type (e.g. "output", "system", "prompt")
  originalLine: string,     // raw text before any transformation
) => AnsiAwareBuffer | null
```

Return values:

- **`line`** — keep the line as-is (pass-through)
- **modified `line`** — show modified version
- **`null`** — suppress the line entirely (hide from output)

---

## Trigger Pattern Types

```typescript
type TriggerSubPattern = string | RegExp | TriggerMatchFunction;
type TriggerPattern = TriggerSubPattern | TriggerSubPattern[];
```

- **`string`** — exact substring match
- **`RegExp`** — regex match; capture groups go into `matches`
- **`TriggerMatchFunction`** — custom `(line, matches, type) => RegExpMatchArray | undefined`
- **Array** — multi-line sequence: each element matches the corresponding successive line

---

## TriggerOptions

```typescript
interface TriggerOptions {
  stayOpenLines?: number;   // keep parent open N lines after matching (for child triggers)
  caseInsensitive?: boolean; // auto-lowercase regex patterns (default: false)
}
```

---

## Registration Methods

```typescript
// Permanent trigger — fires every time pattern matches
api.triggers.register(pattern, callback?, tag?, options?): Trigger

// One-shot — auto-removed after first match
api.triggers.registerOneTime(pattern, callback, tag?, options?): Trigger

// Token trigger — optimized whole-word matching
api.triggers.registerToken(token: string, callback?, tag?, options?): Trigger

// Remove a specific trigger instance
api.triggers.remove(trigger: Trigger): void

// Remove all triggers with a given tag (use this in destroy())
api.triggers.removeByTag(tag: string): void
```

**Tag convention:** use your module name as the tag on every registration (including `registerTokenGate` and `registerToken`) so `removeByTag` cleans up everything in `destroy()`.

**Cleanup is NOT automatic.** The client's unload cleanup removes aliases, UI components, hooks and macros — but **not triggers and not `api.events.on` listeners**. A plugin that skips `removeByTag`/`events.off` in `destroy()` duplicates all its triggers on every plugin reload. In core-plugin, add every new tag to the `TRIGGER_TAGS` list in `src/plugins/core-plugin/index.ts` — `test/plugins/core-plugin/destroy.test.ts` fails if you forget. `removeByTag` also removes token triggers.

---

## Child Triggers (multi-line sequences)

Attach a child trigger to a parent to match across multiple lines:

```typescript
const parent = api.triggers.register(/^Pattern line 1/, (line) => {
  return line;
}, tag, { stayOpenLines: 3 });

const child = api.triggers.register(/^Pattern line 2/, (line, matches) => {
  // fires only when this line follows the parent match within stayOpenLines
  return line;
}, tag);

parent.children.set(child.id, child);
```

---

## AnsiAwareBuffer — Key Methods

The `line` argument in callbacks is an `AnsiAwareBuffer`. All mutation methods return `this` for chaining.

### Reading

```typescript
line.text: string       // plain text content
line.length: number     // character count
line.deleted: boolean   // whether line was suppressed
```

### Suppressing

```typescript
line.markAsDeleted(): this   // suppress output (equivalent to returning null)
return null                  // also suppresses
```

### Coloring

```typescript
// Color a character range [start, end)
line.color([start, end], color): this

// Color all occurrences of word(s)
line.colorWords(words: string | string[], color, options?: { caseInsensitive?: boolean }): this
```

### Appending / Prepending

```typescript
line.append(text: string, color?): this
line.prepend(text: string, color?): this
line.appendBuffer(buffer: AnsiAwareBuffer): this
line.prependBuffer(buffer: AnsiAwareBuffer): this
line.prefix(text: string, color?): this   // alias for prepend at index 0
line.suffix(text: string, color?): this   // alias for append at end
```

### Replacing / Inserting / Removing

```typescript
line.replace([start, end], text: string, color?): this
line.replaceBuffer([start, end], buffer: AnsiAwareBuffer): this
line.insert(index: number, text: string, color?): this
line.insertBuffer(index: number, buffer: AnsiAwareBuffer): this
line.remove([start, end]): this
line.clear(): this
line.clone(): AnsiAwareBuffer
```

### Applying merged format (preserves existing colors)

```typescript
line.applyFormat([start, end], format: FormatStateSnapshot): this
```

---

## Colors

```typescript
api.colors.fromHex(hex: string): FormatStateSnapshot   // e.g. "#ffd700"
api.colors.fromRgb(r, g, b): FormatStateSnapshot       // 0-255 each
```

Pass the result as the `color` argument to any `AnsiAwareBuffer` method.

### Project CMud color palette

The codebase uses a fixed CMud color system with three helper files in `src/lib/colors/`:

| File | What it contains | Type |
| --- | --- | --- |
| `my-colors.ts` | 16 foreground colors, indexed 0–15 | `ColorNumber` |
| `my-bg-colors.ts` | 8 background colors, indexed 0–7 | `BgColorNumber` |
| `my-ansi-colors.ts` | 128 combined fg+bg colors, indexed 0–127 | `AnsiColorNumber` |

**Index mapping** for the combined palette: `ansi_index = (bg_index * 16) + fg_index`

So color 115 → `bg = 7`, `fg = 3` (115 = 7×16 + 3).

**When you know a color number (e.g. "color 115", "color 89"), always use:**

```typescript
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';

const color = getAnsiFormatState(115, api); // FormatStateSnapshot with fg + bg
line.color([start, end], color);
buf.color([0, buf.text.length], color);
```

**Foreground-only color by index (0–15):**

```typescript
import { getMyColor } from '../../../lib/colors/my-colors';

const fg = getMyColor(3, api); // col3 foreground, no background change
```

**Mapping from MudScript/zMUD XML:**

- `%ansi(N)` → `getAnsiFormatState(N, api)`. For example `%ansi(37)` → `getAnsiFormatState(37, api)`.
- Two-argument form `%ansi(fg, bg)` encodes into a single palette index: `bg * 16 + fg`. For example `%ansi(3, 2)` → `2*16+3 = 35` → `getAnsiFormatState(35, api)`.
- `#CO N` / `#CW N`: if N ≤ 15 use `getMyColor(N, api)` (fg-only); if N > 15 use `getAnsiFormatState(N, api)` (ANSI palette with bg).

**Trailing spaces with background colors:** When an ANSI color has a background, always include trailing spaces in the colored text to fill the background visually across the line — e.g. `' '.repeat(100)`. Omitting them cuts off the background at the last character.

**Do not hard-code hex values** for CMud colors — always look them up through these helpers so the palette stays consistent.

---

## Output

```typescript
api.output.print(text: string | AnsiAwareBuffer): void
```

For building rich output manually:

```typescript
const buf = new api.AnsiAwareBuffer();
buf.append("Gold: ", api.colors.fromHex('#aaaaaa'));
buf.append("500", api.colors.fromHex('#ffd700'));
api.output.print(buf);
```

---

## Porting CMud XML Triggers

Reference for translating CMud/zMUD XML `<trigger>` values to plugin API calls.

### `#SAY {text}` → extra output, keep line

```typescript
registerTokenGate(api, 'gateword', /pattern/, (line) => {
  api.output.print('extra text');
  return line;
}, tag);
```

For colored extra output build an `AnsiAwareBuffer` and pass it to `api.output.print`.

### `#SUB {%ansi(N)"label" %trigger}` → prepend colored label

```typescript
const color = getAnsiFormatState(N, api);
registerTokenGate(api, 'gateword', /pattern/, (line) => {
  const buf = new api.AnsiAwareBuffer();
  buf.append('label', color);
  buf.append(' ');
  return line.prependBuffer(buf);
}, tag);
```

### `#SUB {%ansi(N)"label"%ansi(M) %trigger}` → prepend label + tint original

Color the original line first (indices don't shift until prepend), then prepend:

```typescript
registerTokenGate(api, 'gateword', /pattern/, (line) => {
  line.color([0, line.text.length], colorM);
  const buf = new api.AnsiAwareBuffer();
  buf.append('label', colorN);
  buf.append(' ');
  return line.prependBuffer(buf);
}, tag);
```

### `#SUB {%ansi(N)"text"}` (no `%trigger`) → replace line entirely

```typescript
const color = getAnsiFormatState(N, api);
registerTokenGate(api, 'gateword', /pattern/, (line) => {
  const msg = 'replacement text';
  line.replace([0, line.text.length], msg);
  return line.color([0, msg.length], color);
}, tag);
```

### `#CO N` / `#CW N` → color whole line

Both commands map to the same thing: `line.color([0, line.text.length], color)`. Pick the helper based on N:

```typescript
// N ≤ 15 — foreground only
const color = getMyColor(N, api);
// N > 15 — ANSI palette (fg + bg)
const color = getAnsiFormatState(N, api);

registerTokenGate(api, 'gateword', /pattern/, (line) => line.color([0, line.text.length], color), tag);
```

### CMud command values inside triggers

| CMud value | Plugin equivalent |
| --- | --- |
| `mgfn text` | `megaphone(api, 'text')` — import from `../aliases/mgfn` — **do not** send via `api.command.send` |
| `sig text` | `api.command.send('sig text')` — game channel, intentional |
| `;text` | `api.output.print('text')` — local echo only |
| `play_sound` | `api.command.send('play_sound')` |
| `#MO dir` | `api.command.send(dir)` |
| `#ADD var N` | local counter variable — no direct equivalent |

---

## Common Trigger Patterns

### Data-driven: many triggers with the same action structure

When multiple patterns share an identical callback shape, collapse them into a loop:

```typescript
const ANNOUNCES: [string | string[], RegExp, string][] = [
  ['gateword1', /pattern1/, 'message1'],
  [['forma1', 'forma2'], /pattern2/, 'message2'], // one entry per inflection
];
for (const [tokens, pattern, msg] of ANNOUNCES) {
  registerTokenGate(api, tokens, pattern, (line) => {
    megaphone(api, msg);
    return line;
  }, TAG);
}
```

Same idea works for alert triggers (color + sound), heal triggers (prepend label), etc.

### Helper closures to avoid per-trigger boilerplate

Define `col`, `say`, and `prependLabel` inside the setup function — they close over `api` and the pre-built color objects:

```typescript
export function setupMyTriggers(api: PluginApi): void {
  const c38 = getAnsiFormatState(38, api);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const col = (line: any, c: any) => line.color([0, line.text.length], c);

  const say = (text: string, c: ReturnType<typeof getAnsiFormatState>) => {
    const buf = new api.AnsiAwareBuffer(text);
    buf.color([0, text.length], c);
    api.output.print(buf);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prependLabel = (line: any, label: string, labelColor: any, lineColor?: any) => {
    if (lineColor) line.color([0, line.text.length], lineColor);
    const buf = new api.AnsiAwareBuffer();
    buf.append(label, labelColor);
    buf.append(' ');
    return line.prependBuffer(buf);
  };

  registerTokenGate(api, 'danger', /danger/, (line) => col(line, c38), TAG);
  registerTokenGate(api, 'found', /found/, (line) => prependLabel(line, '[ item ]', c38), TAG);
  registerTokenGate(api, 'event', /event/, (line) => { say('  WARNING!', c38); return line; }, TAG);
}
```

Note: `say`/banner printing to output already has a shared helper — `printBanner` in `src/lib/printBanner.ts`. `escapeRegex` lives in `src/lib/escapeRegex.ts`. Check `src/lib/` before writing a new helper.

### Two patterns with identical output → one gate with a pattern array

`registerTokenGate` accepts an array of patterns (tried in order, first match wins), so two old triggers with the same handler become one gate:

```typescript
registerTokenGate(
  api,
  ['piaskowa'],            // gate words must cover BOTH patterns
  [/pattern1/, /pattern2/],
  (line) => {
    api.output.print('');
    say('   BURZA PIASKOWA - ON!!!', c4);
    api.output.print('');
    return line;
  },
  TAG,
);
```

### Build colors once, use everywhere

Always call `getAnsiFormatState` / `getMyColor` at setup time (once), not inside each callback:

```typescript
// Good — built once
const danger = getAnsiFormatState(38, api);
api.triggers.register(/x/, (line) => line.color([0, line.text.length], danger), TAG);

// Bad — rebuilds on every trigger fire
api.triggers.register(/x/, (line) => line.color([0, line.text.length], getAnsiFormatState(38, api)), TAG);
```

---

## Examples

### Highlight a word (token trigger — no gate needed)

```typescript
api.triggers.registerToken("zloto", (line) => {
  return line.colorWords("zloto", api.colors.fromHex('#ffd700'), { caseInsensitive: true });
}, tag, { caseInsensitive: true });
```

### Colorize several words — one token trigger per word

```typescript
for (const word of ['miecz', 'tarcza']) {
  api.triggers.registerToken(word, (line) =>
    line.colorWords(word, api.colors.fromHex('#00cfff'), { caseInsensitive: true }),
    tag, { caseInsensitive: true });
}
```

### Capture a number and print a message

```typescript
registerTokenGate(api, 'zdobywacie', /Zdobywacie (\d+) zlota/, (line, matches) => {
  const amount = parseInt(matches[1]);
  api.output.print(`>> Zdobyto ${amount} zlota!`);
  return line;
}, tag);
```

### Suppress a line

```typescript
registerTokenGate(api, 'pieniadz', /^Czas to pieniadz/, () => null, tag);
```

### One-time trigger (waits for next match then removes itself)

```typescript
api.triggers.registerOneTime(/Otwierasz zamek/, (line) => {
  api.output.print("Zamek otwarty!");
  return line;
}, tag);
```
