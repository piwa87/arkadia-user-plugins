import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';

export async function init(api: PluginApi): Promise<PluginInfo> {
  api.aliases.register(/^say(?:\s+(.*))?$/, (matches) => {
    const text = matches?.[1]?.trim() ?? '';
    api.command.send(`/fake --> ${text}`);
    return true;
  });

  return {
    name: 'Fake Echo Plugin',
    version: '0.1.0',
    description: 'Adds say alias that forwards text to /fake format.',
  };
}
