import type { PluginApi } from '@arkadia/plugin-types';

export function setupBuklakAliases(api: PluginApi): void {
  // buk - drink from flask
  api.aliases.register(/^buk$/, () => {
    api.command.send('napij sie z buklaka');
    return true;
  });

  // buk+ - take flask from bag and attach to belt
  api.aliases.register(/^buk\+$/, () => {
    api.command.send('ot');
    api.command.send('wyj buklak');
    api.command.send('przytrocz buklak');
    return true;
  });

  // buk- - detach flask and put back in bag
  api.aliases.register(/^buk-$/, () => {
    api.command.send('odtrocz buklak');
    api.command.send('ot');
    api.command.send('wlz buklak');
    return true;
  });

  // buk2 - quick drink: open bag, take flask, drink, put back
  api.aliases.register(/^buk2$/, () => {
    api.command.send('ot');
    api.command.send('wyj buklak');
    api.command.send('napij sie z buklaka');
    api.command.send('wlz buklak');
    return true;
  });

  // kub - drink from cup
  api.aliases.register(/^kub$/, () => {
    api.command.send('napij sie z kubka');
    return true;
  });

  // nap - drink water to full
  api.aliases.register(/^nap$/, () => {
    api.command.send('napij sie do syta wody');
    return true;
  });

  // pbuk <person> - detach flask and give to someone
  api.aliases.register(/^pbuk(?:\s+(.+))?$/, (matches) => {
    const person = matches?.[1]?.trim();
    if (!person) return true;
    api.command.send('odtrocz buklak');
    api.command.send(`daj buklak ${person}`);
    return true;
  });
}
