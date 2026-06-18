import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../lib/registerTextAlias';

export function setupPostAliases(api: PluginApi): void {
  // pl<number> - read mail message
  registerTextAlias(api, /^pl(\d+)$/, 'przeczytaj list');

  // li<number> - select mail category (1=Nieprzeczytane, 2=odebrane, 3=wyslane, 4=niewyslane)
  const categories: Record<string, string> = {
    '1': 'nieprzeczytane',
    '2': 'odebrane',
    '3': 'wyslane',
    '4': 'niewyslane',
  };

  api.aliases.register(/^li([1-4])$/, (matches) => {
    const category = categories[matches![1]];
    if (category) {
      api.command.send('listy ' + category);
    }
    return true;
  });
}
