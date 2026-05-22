Use `yarn`, never `npm`.

## Codebase Orientation

When exploring this codebase for the first time:

1. Read `AGENTS.md` for project overview, directory structure, and plugin API summary
2. Read `docs/PLUGINS.md` for the full plugin API reference with examples
3. Read `README.md` for workflow, hosting, and how to add a plugin entry

For existing plugin examples, read `src/plugins/` — especially `core-plugin/` and `my-ra-plugin/`.

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
