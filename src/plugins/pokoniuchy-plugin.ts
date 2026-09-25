import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupPok } from './core-plugin/pokoniuchy';

const TRIGGER_TAG = 'pokoniuchyStandalone';

let apiRef: PluginApi | null = null;
let cleanupPok: (() => void) | null = null;

export async function init(api: PluginApi): Promise<PluginInfo> {
  apiRef = api;
  cleanupPok = setupPok(api, TRIGGER_TAG);

  const info: PluginInfo = {
    name: 'Pokoniuchy Plugin',
    version: '1.0.3',
    author: 'vonhookin',
    description: 'Wyszukiwanie i zapisywanie pokoniuchow; poko_help = pomoc',
  };
  api.output.print(`[${info.name} v${info.version}] loaded`);
  return info;
}

export async function destroy(): Promise<void> {
  cleanupPok?.();
  cleanupPok = null;
  apiRef?.triggers.removeByTag(TRIGGER_TAG);
  apiRef = null;
}
