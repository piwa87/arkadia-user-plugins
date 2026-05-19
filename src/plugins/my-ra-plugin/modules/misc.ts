import type { PluginApi } from '@arkadia/plugin-types';

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupMisc(api: PluginApi): () => void {
  const tag = 'ra:misc';

  api.triggers.register(
    /Rozdzka jest rozpalona/,
    (line) => {
      cecho(api, "\n\n<green>Rozdzka jest rozpalona.\n");
      return line;
    },
    tag
  );

  api.triggers.register(
    /Rozdzka nie jest rozpalona/,
    (line) => {
      cecho(api, "\n\n<red>Rozdzka nie jest rozpalona.\n");
      return line;
    },
    tag
  );

  return () => {
    api.triggers.removeByTag(tag);
  };
}
