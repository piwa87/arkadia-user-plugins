import type { PluginApi } from '@arkadia/plugin-types';

export function setupBronieAliases(api: PluginApi): void {
  // wpr <what> - swap the gemstone in the wielded weapon
  api.aliases.register(/^wpr\s+(.+)$/i, (matches) => {
    const what = matches?.[1]?.trim();
    if (!what) {
      api.output.print('Uzycie: wpr <co>');
      return true;
    }
    api.command.send('wez kamien z dobytej broni');
    api.command.send(`wyj ${what}`);
    api.command.send(`wpraw ${what} w dobyta bron`);
    api.command.send('wlz kamienie');
    return true;
  });
}
