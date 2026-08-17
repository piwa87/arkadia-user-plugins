import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../lib/registerTextAlias';

export function setupPostAliases(api: PluginApi): void {
  // pl<number> - read mail message
  registerTextAlias(api, /^pl(\d+)$/, 'przeczytaj list');

  // li<number> - select mail category (1=odebrane, 2=nieprzeczytane, 3=wyslane, 4=niewyslane)
  const categories: Record<string, string> = {
    '1': 'odebrane',
    '2': 'nieprzeczytane',
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

  // sms <text> - quick mail (write list, message, tl, send)
  api.aliases.register(/^sms\s+(.+)$/i, (matches) => {
    api.command.send('napisz list', false);
    api.command.send(matches![1], false);
    api.command.send('tl', false);
    api.command.send('');
    return true;
  });

  // send - send animal
  api.aliases.register(/^send$/i, () => {
    api.command.send('x', false);
    api.command.send('wyslij zwierze');
    return true;
  });

  // fw <args> - forward mail
  api.aliases.register(/^fw\s+(.+)$/i, (matches) => {
    api.command.send('f ' + matches![1]);
    return true;
  });

  // fwd <args> - forward mail (uppercase)
  api.aliases.register(/^fwd\s+(.+)$/i, (matches) => {
    api.command.send('F ' + matches![1]);
    return true;
  });
}
