import type { PluginApi } from '@arkadia/plugin-types';

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
  api.aliases.register(/^naplam$/i, () => {
    api.command.send('napelnij lampe olejem');
    return true;
  });

  // sus - extinguish lamp
  api.aliases.register(/^sus$/i, () => {
    api.command.send('zgas lampe');
    return true;
  });
}
