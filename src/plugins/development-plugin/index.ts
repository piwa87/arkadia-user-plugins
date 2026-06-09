import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupCmudCombatAliases } from './combat';
import { setupMiscAliases } from './misc';
import { setupHelpAlias } from './help';
import { setupNewStuffAliases } from './new_stuff';
export async function init(api: PluginApi): Promise<PluginInfo> {
  setupCmudCombatAliases(api);
  setupMiscAliases(api);
  setupHelpAlias(api);
  setupNewStuffAliases(api);

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
