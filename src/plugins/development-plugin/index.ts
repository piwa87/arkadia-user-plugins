import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupZlecenia, destroyZlecenia } from './zlecenia';

export async function init(api: PluginApi): Promise<PluginInfo> {
  setupZlecenia(api);

  const info: PluginInfo = {
    name: 'Development Plugin',
    version: '1.1.1',
    author: 'Piot',
    description: 'Development plugin...',
  };

  api.output.print(`[${info.name} v${info.version}] loaded`);
  return info;
}

export function destroy(api: PluginApi): void {
  destroyZlecenia(api);
}
