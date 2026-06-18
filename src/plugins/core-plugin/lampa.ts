import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../lib/registerTextAlias';

export function setupLampAliases(api: PluginApi): void {
  // la+ - equip lamp: take lamp and oil, attach lamp, refill
  api.aliases.register(/^la\+$/, () => {
    api.command.send('wyj lampe|olej');
    api.command.send('przytrocz lampe');
    api.command.send('naplam');
    api.command.send('/zap');
    return true;
  });

  // la- - unequip lamp: disable glow, detach lamp, store lamp and oil
  api.aliases.register(/^la-$/, () => {
    api.command.send('/zg');
    api.command.send('odtrocz lampe');
    api.command.send('wlz lampe|oleje');
    return true;
  });

  // naplam - fill lamp with oil
  registerTextAlias(api, /^naplam$/i, 'napelnij lampe olejem');

  // sus - extinguish lamp
  registerTextAlias(api, /^sus$/i, 'zgas lampe');
}
