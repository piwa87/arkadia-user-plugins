import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupMovementAliases } from './movement';
import { setupCmudCombatAliases } from './combat';
import { setupLootAliases } from './loot';
import { setupMiscAliases } from './misc';
import { setupHelpAlias } from './help';

export async function init(api: PluginApi): Promise<PluginInfo> {
  setupMovementAliases(api);
  setupCmudCombatAliases(api);
  setupLootAliases(api);
  setupMiscAliases(api);
  setupHelpAlias(api);

  const info: PluginInfo = {
    name: 'Dev Preview',
    version: '0.2.0',
    author: 'Piot',
    description: 'Eksperymentalne aliasy CMUD → web client. ?devhelp = lista',
  };

  api.output.print(`[${info.name} v${info.version}] loaded — ?devhelp = lista aliasów`);
  return info;
}

export function destroy(): void {}
