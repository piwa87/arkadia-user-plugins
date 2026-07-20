Use `yarn`, never `npm`.

## Codebase Orientation

When exploring this codebase for the first time:

1. Read `AGENTS.md` for project overview, directory structure, and plugin API summary
2. Read `README.md` for workflow, hosting, and how to add a plugin entry

For existing plugin examples, read `src/plugins/` — especially `core-plugin/` and `development-plugin/`.

## API Reference — Always Consult Before Implementing (the cheap way)

Before writing any trigger, alias, event listener, or other plugin feature, consult the matching reference in `src/instructions/` (the file-to-topic table is in AGENTS.md below). Do it WITHOUT reading whole files:

1. List the sections first: `grep -n '^##' src/instructions/<FILE>.md`
2. Read ONLY the section you need (Read with offset/limit).
3. Exception — always read in full before any trigger work: the `RULE #1` section at the top of `TRIGGERS_REFERENCE.md` (~50 lines). It is the difference between a trigger that costs nothing and one that runs on every line of game output.

The hard rules are also machine-enforced, so skipping the docs does not skip the rules: `test/trigger-budget.test.ts` fails on new always-on triggers and `test/plugins/core-plugin/destroy.test.ts` fails on leaked cleanup. A PreToolUse hook additionally injects the convention summary on the first plugin-source edit of each session.

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
