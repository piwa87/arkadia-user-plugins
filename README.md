# Arkadia User Plugins

Standalone Arkadia Web Client plugins that can be developed locally, tested quickly, and published as static `.js` files for GitHub Pages.

This directory is meant to become the root of its own repository. While it is nested inside the Arkadia client workspace, local commands work as-is, but the GitHub Actions workflow will only run after you move or copy this project into a dedicated repository.

## Workflow

1. Install dependencies:

```bash
yarn install
```

2. Start local development:

```bash
yarn dev
```

This builds every `src/plugins/*-plugin.ts` entry into `dist/`, starts a static server on `http://localhost:3030`, and rebuilds when files change.

3. Add a local plugin URL to the Arkadia client, for example:

```text
http://localhost:3030/my-aliases-plugin.js
```

4. Run fast checks locally:

```bash
yarn test
yarn typecheck
yarn build
```

## Testing Strategy

- Put most logic into small helpers under `src/lib/`.
- Unit-test helpers directly with Vitest.
- Test plugin registration and command behavior with a mocked `PluginApi`.
- Use the local dev server only for smoke tests in the real client.

That keeps deploys out of the main feedback loop.

## Plugin Entries

Every file matching `src/plugins/**/*-plugin.ts` is treated as a deployable plugin entry and compiled to `dist/`.

Examples:

- `src/plugins/my-aliases-plugin.ts` -> `dist/my-aliases-plugin.js`
- `src/plugins/combat/loot-plugin.ts` -> `dist/combat/loot-plugin.js`

Internal helpers can live anywhere else under `src/` and be imported normally.

## Hosting

### GitHub Pages

The workflow in `.github/workflows/deploy.yml` publishes the `dist/` directory to GitHub Pages on every push to `main`.

After enabling Pages in the repository settings, your plugin URLs will look like:

```text
https://<user>.github.io/<repo>/my-aliases-plugin.js
```

The build also generates:

- `dist/index.html` with a simple plugin listing
- `dist/plugins.json` with relative plugin paths

### Netlify

Netlify works too. Set the publish directory to `dist` and the build command to:

```bash
yarn build
```

Netlify preview deploys are a good fallback if your browser blocks loading `http://localhost` from an `https://` client page.

## Adding a Plugin

Create a new entry file under `src/plugins/`.

```ts
import type { PluginApi, PluginInfo } from "@arkadia/plugin-types";

export async function init(api: PluginApi): Promise<PluginInfo> {
  api.aliases.register(/^\/hello$/, () => {
    api.output.print("hello from plugin");
    return true;
  });

  return {
    name: "Hello Plugin",
    version: "0.1.0"
  };
}
```

## Notes

- Use `import type` from `@arkadia/plugin-types` only.
- Plugin code must compile to browser ESM.
- Keep user-facing behavior behind stable plugin URLs so you only need to update the hosted files, not the client itself.
