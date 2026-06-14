import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupHelpAlias } from './help';
import { setupZlecenia, destroyZlecenia } from './zlecenia';

export async function init(api: PluginApi): Promise<PluginInfo> {
  setupHelpAlias(api);
  setupZlecenia(api);

  const info: PluginInfo = {
    name: 'Dev Preview',
    version: '0.2.0',
    author: 'Piot',
    description: 'Eksperymentalne aliasy CMUD → web client. ?devhelp = lista',
  };

  api.output.print(`[${info.name} v${info.version}] loaded — ?devhelp = lista aliasów`);
  return info;
}

export function destroy(api: PluginApi): void {
  destroyZlecenia(api);
}
