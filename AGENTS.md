# AGENTS

This document provides context for AI agents working on this codebase.

## Project Overview

`arkadia-user-plugins` is a standalone TypeScript project for developing personal plugins for the [Arkadia Web Client](https://arkadia.rpg.pl). Plugins are compiled to browser-native ES modules and hosted as static `.js` files (GitHub Pages or any static host). The Arkadia client loads them dynamically at runtime via a URL.

## Directory Structure

```
src/
├── plugins/          # Plugin entry points — each *-plugin.ts compiles to dist/*.js
│   ├── core-plugin/  # Multi-file plugins can live in a subdirectory
│   └── *.ts          # Single-file plugin entries
├── lib/              # Shared helpers imported by multiple plugins (not compiled directly)
│   └── colors/       # Color utilities
└── instructions/     # Developer guides (Markdown)

test/                 # Vitest unit tests (mirrors src/ structure)
├── helpers/
│   └── mockApi.ts    # Mock PluginApi for unit tests
scripts/              # Build / dev / serve scripts (esbuild + static server)
dist/                 # Compiled output — served by GitHub Pages
docs/                 # Plugin API and development documentation
.claude/
├── commands/         # Custom slash commands (e.g. /deploy)
└── skills/           # AI agent skills for common tasks
```

## Tech Stack

- **Language**: TypeScript 5
- **Build**: esbuild (via custom scripts in `scripts/`)
- **Dev server**: local static HTTP server on `http://localhost:3030`
- **Testing**: Vitest
- **Type checking**: `tsc --noEmit`
- **Plugin types**: `@arkadia/plugin-types` (installed from the extension's GitHub Pages)

## Development Commands

```bash
yarn install      # Install dependencies
yarn dev          # Build + watch + serve on http://localhost:3030
yarn build        # One-shot production build to dist/
yarn test         # Run Vitest unit tests
yarn typecheck    # TypeScript type check (no emit)
```

## Plugin Entry Points

Every file matching `src/plugins/**/*-plugin.ts` is a plugin entry point and compiles to a corresponding path under `dist/`. Import helpers from `src/lib/` freely — esbuild bundles everything into the single output file.

```
src/plugins/my-alerts-plugin.ts   →   dist/my-alerts-plugin.js
src/plugins/combat/loot-plugin.ts →   dist/combat/loot-plugin.js
```

## Plugin API

Plugins receive a `PluginApi` object from the client on load. All namespaces:

| Namespace | Purpose | Reference |
| --- | --- | --- |
| `api.triggers` | Register regex/string/token triggers against game output | `src/instructions/TRIGGERS_REFERENCE.md` |
| `api.aliases` | Register custom commands (e.g. `al attack`) | `src/instructions/ALIASES_AND_COMMANDS_REFERENCE.md` |
| `api.command` | Send commands to the server, tab-completion | `src/instructions/ALIASES_AND_COMMANDS_REFERENCE.md` |
| `api.commandHooks` | Intercept and modify commands before processing | `src/instructions/ALIASES_AND_COMMANDS_REFERENCE.md` |
| `api.output` | Print text to the game window | `src/instructions/TRIGGERS_REFERENCE.md` |
| `api.colors` | Create color states from hex/RGB | `src/instructions/TRIGGERS_REFERENCE.md` |
| `api.AnsiAwareBuffer` | Build colored/formatted text buffers | `src/instructions/TRIGGERS_REFERENCE.md` |
| `api.events` | Listen to and emit game events | `src/instructions/EVENTS_REFERENCE.md` |
| `api.map` | Read current room / map position / pathfinding | `src/instructions/MAP_AND_GMCP_API_REFERENCE.md` |
| `api.gmcp` | Read raw GMCP data | `src/instructions/MAP_AND_GMCP_API_REFERENCE.md` |
| `api.ui` | Footer widgets, popups, context/popup menus | `src/instructions/UI_REFERENCE.md` |
| `api.bind` | Functional key bind management | `src/instructions/UI_REFERENCE.md` |
| `api.team` | Team membership and leader info | `src/instructions/COMBAT_AND_OBJECTS_REFERENCE.md` |
| `api.objects` | Objects/NPCs in current location | `src/instructions/COMBAT_AND_OBJECTS_REFERENCE.md` |
| `api.attackQueue` | Attack queue management | `src/instructions/COMBAT_AND_OBJECTS_REFERENCE.md` |
| `api.attackController` | Execute attacks with team coordination | `src/instructions/COMBAT_AND_OBJECTS_REFERENCE.md` |
| `api.combat` | Combat helpers (draw weapon, etc.) | `src/instructions/COMBAT_AND_OBJECTS_REFERENCE.md` |
| `api.objectListFilters` | Customise the object list appearance | `src/instructions/COMBAT_AND_OBJECTS_REFERENCE.md` |
| `api.containers` | Put/take items from assigned bags | `src/instructions/GAME_SYSTEMS_REFERENCE.md` |
| `api.herbs` | Herb inventory management | `src/instructions/GAME_SYSTEMS_REFERENCE.md` |
| `api.prettyContainers` | Container item formatting/grouping | `src/instructions/GAME_SYSTEMS_REFERENCE.md` |
| `api.magics` | Magic item pattern database | `src/instructions/GAME_SYSTEMS_REFERENCE.md` |
| `api.magicKeys` | Magic key pattern database | `src/instructions/GAME_SYSTEMS_REFERENCE.md` |
| `api.settings` | Character and UI settings (read-only) | `src/instructions/GAME_SYSTEMS_REFERENCE.md` |
| `api.locationNotes` | Plugin-contributed map location notes | `src/instructions/GAME_SYSTEMS_REFERENCE.md` |
| `api.people` | People database (social list) | `src/instructions/GAME_SYSTEMS_REFERENCE.md` |
| `api.buttonMacros` | Register stateful button macros | `src/instructions/GAME_SYSTEMS_REFERENCE.md` |
| `api.triggerMacros` | Register user-configurable trigger macros | `src/instructions/GAME_SYSTEMS_REFERENCE.md` |

## API Instruction Files

Before implementing any new trigger, alias, event listener, or other plugin feature, **read the relevant instruction file** from `src/instructions/`:

| File | What it covers |
| --- | --- |
| `TRIGGERS_REFERENCE.md` | Triggers, AnsiAwareBuffer, colors, output — **start here for any trigger work** |
| `ALIASES_AND_COMMANDS_REFERENCE.md` | Aliases, sending commands, command hooks, cleanup pattern |
| `EVENTS_REFERENCE.md` | Full event name list with payloads |
| `MAP_AND_GMCP_API_REFERENCE.md` | Map API, GMCP API, room data types |
| `UI_REFERENCE.md` | Footer components, popups, menus, functional bind |
| `COMBAT_AND_OBJECTS_REFERENCE.md` | Combat, objects in room, attack queue/controller, object list |
| `GAME_SYSTEMS_REFERENCE.md` | Containers, herbs, settings, people, macros, location notes |
| `FUNCTIONAL_BIND_ALIAS_GUIDE.md` | Worked example: bind set/fire pattern |

## Plugin Structure

```typescript
import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';

export async function init(api: PluginApi): Promise<PluginInfo> {
  const tag = "myPlugin"; // unique tag for cleanup

  api.triggers.register(/pattern/i, (line, matches) => {
    return line; // or null to suppress, or modified line
  }, tag);

  return {
    name: "My Plugin",
    version: "1.0.0",
    description: "What it does"
  };
}

export async function destroy(): Promise<void> {
  // cleanup if needed
}
```

## Testing

- Tests live in `test/` mirroring `src/` paths
- Use `test/helpers/mockApi.ts` for a `PluginApi` mock
- Test logic in `src/lib/` directly (pure functions, no API needed)
- Test plugin registration with the mock API

```bash
yarn test              # run all tests
yarn test -- --watch   # watch mode
```

## Coding Guidelines

- Use `yarn`, never `npm`
- Import types with `import type` from `@arkadia/plugin-types`
- All plugin code must compile to browser ESM (no Node.js APIs)
- Use a unique `tag` string per plugin for trigger/alias cleanup — pass it to every `api.triggers.register()` call; call `api.triggers.removeByTag(tag)` in `destroy()`
- Always return from trigger callbacks: modified `line`, original `line`, or `null` (to suppress)
- In `destroy()`, remove all event listeners, intervals, aliases, command hooks, and UI components registered during `init()`
- Never include Polish characters in regex patterns — keep patterns ASCII-compatible
- Read the relevant instruction file from `src/instructions/` before implementing any new feature

## Deployment

Push to `main` → GitHub Actions builds and deploys `dist/` to GitHub Pages.
Use `/deploy` slash command in Claude Code to run checks and push.
Plugin URLs: `https://<user>.github.io/<repo>/<plugin-name>.js`
