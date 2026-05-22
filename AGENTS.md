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

Plugins receive a `PluginApi` object from the client on load. The full API reference is in `docs/PLUGINS.md`. Key namespaces:

| Namespace | Purpose |
|---|---|
| `api.triggers` | Register regex/string/token triggers against game output |
| `api.aliases` | Register custom commands (e.g. `/foo bar`) |
| `api.output` | Print text to the game window |
| `api.colors` | Create color states from hex/RGB |
| `api.events` | Listen to and emit game events |
| `api.command` | Send commands to the server |
| `api.map` | Read current room / map position |
| `api.team` | Team membership and leader info |
| `api.gmcp` | Read raw GMCP data |
| `api.objectListFilters` | Customise the object list appearance |
| `api.buttonMacros` | Register stateful button macros |
| `api.triggerMacros` | Register user-configurable trigger macros |
| `api.AnsiAwareBuffer` | Build colored/formatted text buffers |
| `api.ui` | Register footer/status-bar widgets |

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
- Use a unique `tag` string per plugin for trigger/alias cleanup
- Always return from trigger callbacks: modified `line`, original `line`, or `null` (to suppress)
- In `destroy()`, remove any event listeners or intervals you created
- See `docs/PLUGINS.md` for the full API reference and patterns

## Deployment

Push to `main` → GitHub Actions builds and deploys `dist/` to GitHub Pages.
Use `/deploy` slash command in Claude Code to run checks and push.
Plugin URLs: `https://<user>.github.io/<repo>/<plugin-name>.js`
