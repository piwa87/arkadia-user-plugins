Use `yarn`, never `npm`.

## Codebase Orientation

When exploring this codebase for the first time:

1. Read `AGENTS.md` for project overview, directory structure, and plugin API summary
2. Read `README.md` for workflow, hosting, and how to add a plugin entry

For existing plugin examples, read `src/plugins/` — especially `core-plugin/` and `development-plugin/`.

## API Reference — Always Consult Before Implementing

Before writing any trigger, alias, event listener, or other plugin feature, read the relevant file from `src/instructions/`:

- `TRIGGERS_REFERENCE.md` — triggers, AnsiAwareBuffer methods, colors, output (start here for trigger work)
- `ALIASES_AND_COMMANDS_REFERENCE.md` — aliases, command sending, command hooks, cleanup pattern
- `EVENTS_REFERENCE.md` — all event names with payload types
- `MAP_AND_GMCP_API_REFERENCE.md` — map API, GMCP API, room data
- `UI_REFERENCE.md` — footer components, popups, context/popup menus, functional bind
- `COMBAT_AND_OBJECTS_REFERENCE.md` — attack queue, attack controller, objects in room, object list filters
- `GAME_SYSTEMS_REFERENCE.md` — containers, herbs, settings, people, button/trigger macros, location notes
- `FUNCTIONAL_BIND_ALIAS_GUIDE.md` — worked example for the bind set/fire pattern

## Development Commands

```bash
yarn dev          # build + watch + serve on http://localhost:3030
yarn build        # production build to dist/
yarn test         # Vitest unit tests
yarn typecheck    # tsc --noEmit (no output = success)
```

## Custom Slash Commands

- `/deploy` — run type checks + tests, then push to main (triggers GitHub Pages deploy)

## Base Instructions

All instructions in AGENTS.md apply.

@AGENTS.md
