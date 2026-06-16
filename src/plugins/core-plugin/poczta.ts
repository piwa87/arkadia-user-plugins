import type { PluginApi } from '@arkadia/plugin-types';

export function setupPostAliases(api: PluginApi): void {
  // pl<number> - read mail message
  api.aliases.register(/^pl(\d+)$/, (matches) => {
    const number = matches![1];
    api.command.send(`przeczytaj list ${number}`);
    return true;
  });

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
