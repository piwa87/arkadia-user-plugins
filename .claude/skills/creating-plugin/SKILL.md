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

export async function init(api: PluginApi): Promise<PluginInfo> {
  const tag = "myFeature"; // unique across all your plugins

  // Register triggers, aliases, events here

  return {
    name: "My Feature",
    version: "1.0.0",
    description: "What it does"
  };
}

export async function destroy(): Promise<void> {
  // Remove event listeners you added via api.events.on()
  // Clear any setInterval / setTimeout handles
  // Triggers and aliases registered with `tag` are cleaned up automatically
}
```

## Triggers

```typescript
api.triggers.register(
  /Zdobywasz (\d+) punktow/,  // RegExp, string, or array for multi-line sequences
  (line, matches) => {
    const xp = matches[1];
    api.output.print(`+${xp} PD`);
    return line;              // return line to keep it, null to suppress
  },
  tag
);

// One-time trigger (self-removes after first match)
api.triggers.registerOneTime(/Potwierdzono/, (line) => {
  // ...
  return line;
}, tag);
```

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

Remove only what isn't cleaned up automatically:

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
}
```

Triggers and aliases registered with a `tag` are removed automatically — no manual cleanup needed for those.

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

Use the mock API from `test/helpers/mockApi.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createMockApi } from '../helpers/mockApi';
import { init } from '../../src/plugins/my-feature-plugin';

describe('my-feature-plugin', () => {
  it('registers a trigger', async () => {
    const api = createMockApi();
    await init(api as any);
    expect(api.triggers.register).toHaveBeenCalled();
  });
});
```

Test pure helpers in `src/lib/` without the API at all.

## After adding a plugin

- [ ] Entry file is `src/plugins/**/*-plugin.ts`
- [ ] Trigger patterns are ASCII-only
- [ ] Colored text: plain `append` after colored content passes explicit state
- [ ] `tag` is unique across all plugins in the repo
- [ ] `destroy()` cleans up intervals and `api.events.on()` listeners
- [ ] Test file added under `test/`
- [ ] `yarn typecheck` passes
- [ ] `yarn test` passes
- [ ] `yarn build` produces the `.js` file in `dist/`
- [ ] Plugin loads correctly from `http://localhost:3030` in the Arkadia client

## Full API reference

See `docs/PLUGINS.md` for the complete API with examples (triggers, colors, aliases, events, maps, team, GMCP, objectListFilters, buttonMacros, triggerMacros, AnsiAwareBuffer).
