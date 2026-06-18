import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupZlecenia, destroyZlecenia } from './zlecenia';

export async function init(api: PluginApi): Promise<PluginInfo> {
  setupZlecenia(api);

  const info: PluginInfo = {
    name: 'Dev Preview',
    version: '0.2.0',
    author: 'Piot',
    description: 'Eksperymentalne aliasy CMUD → web client.',
  };

  api.output.print(`[${info.name} v${info.version}] loaded`);
  return info;
}

export function destroy(api: PluginApi): void {
  destroyZlecenia(api);
}
