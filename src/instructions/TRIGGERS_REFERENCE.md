# Triggers Reference

Reference for `api.triggers`, `AnsiAwareBuffer`, and `api.colors` — the core tools for reacting to game output.

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

**Tag convention:** use your plugin name as the tag on every registration so `removeByTag` cleans up everything in `destroy()`.

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

**Foreground-only color by index:**

```typescript
import { getMyColor } from '../../../lib/colors/my-colors';

const fg = getMyColor(3, api); // col3 foreground, no background change
```

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

## Examples

### Highlight a word in gold

```typescript
api.triggers.register(/zloto/i, (line) => {
  const idx = line.text.toLowerCase().indexOf("zloto");
  if (idx !== -1) line.color([idx, idx + 5], api.colors.fromHex('#ffd700'));
  return line;
}, tag);
```

### Colorize all matches of multiple words

```typescript
api.triggers.register(/miecz|tarcza/, (line) => {
  return line.colorWords(["miecz", "tarcza"], api.colors.fromHex('#00cfff'), { caseInsensitive: true });
}, tag);
```

### Capture a number and print a message

```typescript
api.triggers.register(/Zdobywacie (\d+) zlota/, (line, matches) => {
  const amount = parseInt(matches[1]);
  api.output.print(`>> Zdobyto ${amount} zlota!`);
  return line;
}, tag);
```

### Suppress a line

```typescript
api.triggers.register(/^Czas to pieniadz/, () => null, tag);
```

### Token trigger for single word

```typescript
api.triggers.registerToken("zloto", (line, matches) => {
  return line.colorWords("zloto", api.colors.fromHex('#ffd700'), { caseInsensitive: true });
}, tag);
```

### One-time trigger (waits for next match then removes itself)

```typescript
api.triggers.registerOneTime(/Otwierasz zamek/, (line) => {
  api.output.print("Zamek otwarty!");
  return line;
}, tag);
```
