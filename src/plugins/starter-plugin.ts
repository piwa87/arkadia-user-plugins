import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { findMatchRange } from '../lib/findMatchRange';

export async function init(api: PluginApi): Promise<PluginInfo> {
  const tag = 'starterPlugin';
  const accent = api.colors.fromHex('#d97706');

  api.triggers.register(
    /alarm|uwaga/i,
    (line, matches) => {
      const range = findMatchRange(line.text, matches[0]);
      return range ? line.color(range, accent) : line;
    },
    tag,
  );

  api.aliases.register(/^\/starter(?:\s+(.*))?$/, (matches) => {
    const payload = matches?.[1]?.trim();
    api.command.send(payload ? `powiedz ${payload}` : 'powiedz starter plugin ready');
    return true;
  });

  api.aliases.register(/^buu$/, () => {
    api.command.send('zerknij');
    api.command.send('podrap sie po jajach');
    return true;
  });

  return {
    name: 'Starter Plugin',
    version: '0.1.0',
    description: 'Starter scaffold for Arkadia Web Client plugins',
  };
}
