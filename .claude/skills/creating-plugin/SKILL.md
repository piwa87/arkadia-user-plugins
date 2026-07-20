---
name: creating-plugin
description: Use this skill when creating a new plugin in this repo — adding a new plugin entry file, wiring it into the build, writing tests, and following API conventions. Covers file placement, PluginApi usage, trigger patterns, color gotchas, aliases, events, and the destroy() lifecycle.
---

# Creating a Plugin

Plugins live under `src/plugins/`. Any file matching `src/plugins/**/*-plugin.ts` is automatically picked up by the build and compiled to `dist/`.

## File placement

```
src/plugins/my-feature-plugin.ts          →  dist/my-feature-plugin.js
src/plugins/combat/my-combat-plugin.ts    →  dist/combat/my-combat-plugin.js
```

Multi-file plugins: create a directory and a `*-plugin.ts` entry that imports from it:

```
src/plugins/my-feature-plugin.ts          (entry — imports from my-feature-plugin/)
src/plugins/my-feature-plugin/
├── index.ts
├── triggers.ts
└── aliases.ts
```

## Minimal plugin skeleton

```typescript
import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';

const TAG = "myFeature"; // unique across all your plugins

// The client calls destroy() with NO arguments — keep the api from init.
let apiRef: PluginApi | null = null;

export async function init(api: PluginApi): Promise<PluginInfo> {
  apiRef = api;

  // Register triggers, aliases, events here

  return {
    name: "My Feature",
    version: "1.0.0",
    description: "What it does"
  };
}

export async function destroy(): Promise<void> {
  // The client does NOT auto-remove triggers or api.events.on listeners.
  apiRef?.triggers.removeByTag(TAG);
  // ...also events.off() every listener and clear any timers here.
  apiRef = null;
}
```

**Directory plugins:** the `*-plugin.ts` entry wrapper must re-export **both** functions — `export { init, destroy } from './my-feature-plugin/index';`. If it only exports `init`, the client never runs your cleanup and every plugin reload duplicates all your triggers.

## Triggers — ALWAYS use registerTokenGate for phrase matching

The client tests every plain `api.triggers.register` pattern against **every line of game output**; token triggers are word-indexed and ~free. This repo enforces a budget on always-on triggers (`test/trigger-budget.test.ts` fails if you add one). Read `src/instructions/TRIGGERS_REFERENCE.md` RULE #1 before writing any trigger.

```typescript
import { registerTokenGate } from '../lib/registerTokenGate';

// (api, gateWords, pattern, callback, tag)
registerTokenGate(
  api,
  'punktow',                   // rare word present in every matchable line
  /Zdobywasz (\d+) punktow/,   // the pattern, unchanged — capture groups work
  (line, matches) => {
    api.output.print(`+${matches[1]} PD`);
    return line;               // return line to keep it, null to suppress
  },
  TAG,
);

// Gate words must survive the client tokenizer (split on spaces and .,!?*()/[]),
// cover every alternation branch, and include each Polish inflection
// (['zmeczony', 'zmeczona']). Extra tokens are free.

// Simple word coloring — direct token trigger, no gate:
api.triggers.registerToken('zloto', (line) =>
  line.colorWords('zloto', gold, { caseInsensitive: true }),
  TAG, { caseInsensitive: true });

// One-time trigger (self-removes after first match) — fine as-is, it leaves
// the walk after firing. Always pass a tag so armed-but-unmatched ones are
// removable; for delayed-command one-shots use lib/registerTempTrigger.
api.triggers.registerOneTime(/Potwierdzono/, (line) => {
  return line;
}, TAG);
```

Plain `api.triggers.register` is allowed **only** for full-line parsers where no single word is common to all matchable lines (7 exist in the repo; a new one needs a justified budget bump in `test/trigger-budget.test.ts`).

**Regex must be ASCII-only.** Polish letters in patterns are forbidden — write `umarl` not `umarł`, `mezczyzna` not `mężczyzna`. Game output is normalized before matching.

## Coloring text — the color-leak gotcha

After appending colored content, every subsequent plain `append` inherits that color. Always pass an explicit `{}` (reset) or a real color state when appending plain text after colored content.

```typescript
const RED = api.colors.fromHex('#ff0000');
const RESET = {}; // empty state = reset

// Coloring a matched word in a line:
const colorStringInLine = (line: any, text: string, color: any) => {
  const idx = line.text.indexOf(text);
  if (idx === -1) return line;
  return line.color([idx, idx + text.length], color);
};

// Building a new buffer:
const buf = new api.AnsiAwareBuffer("Alarm! ", RED);
buf.append("treść", RESET);   // ✅ explicit reset
buf.append("treść");           // ❌ inherits RED
```

## Aliases

```typescript
api.aliases.register(/^\/foo(?:\s+(.*))?$/, (matches) => {
  const arg = matches?.[1] ?? "";
  api.output.print(`foo: ${arg}`);
  return true; // stop further processing
});
```

Use the `/command` prefix convention. Always handle the empty-argument case.

## Events

```typescript
// Listen
api.events.on("mapMove", () => {
  const room = api.map.getRoom();
  api.output.print(`Jesteś w: ${room?.name}`);
});

// Send a game command
api.command.send("look");

// Sound
api.events.emit("sound:play", { key: "beep" });

// OS notification
api.events.emit("notify", { text: "Uwaga!", time: 3000 });
```

**Common events:** `mapMove`, `enemyKilled`, `command`, `gmcp`, `gmcp.char.vitals`, `gmcp.room.info`, `gmcp.objects.data`, `sound:play`, `sendCommand`, `notify`

## Output

```typescript
api.output.print("plain text");
api.output.print(buffer);       // AnsiAwareBuffer
```

## Destroy lifecycle

The client auto-removes aliases, UI components, command hooks, and macros on unload. It does **NOT** remove triggers or `api.events.on` listeners — those are yours:

```typescript
let intervalId: ReturnType<typeof setInterval>;
let onMove: () => void;

export async function init(api: PluginApi): Promise<PluginInfo> {
  intervalId = setInterval(() => { /* ... */ }, 5000);
  onMove = () => { /* ... */ };
  api.events.on("mapMove", onMove);
  // ...
}

export async function destroy() {
  clearInterval(intervalId);
  api.events.off("mapMove", onMove);
  api.triggers.removeByTag(TAG); // covers token gates and token triggers too
}
```

In **core-plugin**, don't hand-roll this: add your trigger tag to the `TRIGGER_TAGS` list in `src/plugins/core-plugin/index.ts` and (for event listeners) return a cleanup function from your setup and wire it into `destroy()` there. `test/plugins/core-plugin/destroy.test.ts` fails if anything leaks.

## Shared helpers

Put reusable logic under `src/lib/` and import it in your plugin:

```typescript
// src/lib/findMatchRange.ts
export function findMatchRange(text: string, match: string): [number, number] { ... }

// src/plugins/my-plugin.ts
import { findMatchRange } from '../lib/findMatchRange';
```

esbuild bundles everything, so `src/lib/` files do not become separate output files.

## Testing

Mirror the plugin path in `test/`:

```
src/plugins/my-feature-plugin.ts   →   test/my-feature-plugin.test.ts
src/lib/helpers.ts                 →   test/lib/helpers.test.ts
```

Use the mock API from `test/helpers/mockApi.ts` and drive triggers through `runLine` — it replicates the client's dispatch (regular triggers, then token triggers via the tokenized-bucket walk), so the same test passes whether the trigger is a regex or a token gate. Never locate triggers via `pattern.test(...)`; token triggers have no regex pattern.

```typescript
import { describe, it, expect } from 'vitest';
import { createMockApi, runLine } from '../helpers/mockApi';
import { init } from '../../src/plugins/my-feature-plugin';

describe('my-feature-plugin', () => {
  it('reacts to the XP line', async () => {
    const mock = createMockApi();
    await init(mock.api);
    runLine(mock, 'Zdobywasz 50 punktow.');
    expect(mock.api.output.print).toHaveBeenCalledWith('+50 PD');
  });
});
```

Test pure helpers in `src/lib/` without the API at all.

## After adding a plugin

- [ ] Entry file is `src/plugins/**/*-plugin.ts` and re-exports **both** `init` and `destroy`
- [ ] Phrase triggers use `registerTokenGate` (or `registerToken`) — `yarn test` passes `trigger-budget.test.ts`
- [ ] Trigger patterns are ASCII-only
- [ ] Colored text: plain `append` after colored content passes explicit state
- [ ] `tag` is unique across all plugins in the repo and passed to every registration
- [ ] `destroy()` calls `removeByTag`, `events.off()` for every listener, and clears timers (client auto-cleans aliases/UI/hooks — not these)
- [ ] Test file added under `test/`, driving triggers via `runLine`
- [ ] `yarn typecheck` passes
- [ ] `yarn test` passes
- [ ] `yarn build` produces the `.js` file in `dist/`
- [ ] Plugin loads correctly from `http://localhost:3030` in the Arkadia client

## Full API reference

See `docs/PLUGINS.md` for the complete API with examples (triggers, colors, aliases, events, maps, team, GMCP, objectListFilters, buttonMacros, triggerMacros, AnsiAwareBuffer).
