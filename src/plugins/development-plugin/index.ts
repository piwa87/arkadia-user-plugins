import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupZlecenia, destroyZlecenia } from './zlecenia';

// The client calls destroy() with no arguments, so keep the api from init.
let apiRef: PluginApi | null = null;

export async function init(api: PluginApi): Promise<PluginInfo> {
  apiRef = api;
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

export function destroy(): void {
  if (!apiRef) return;
  destroyZlecenia(apiRef);
  apiRef = null;
}
