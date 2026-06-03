import type { PluginApi } from '@arkadia/plugin-types';

export function setupMieszekAliases(api: PluginApi): void {
  // otm - open coin pouch and take coins
  api.aliases.register(/^otm$/, () => {
    api.command.send('otworz przytroczona sakiewke');
    api.command.send('wez monety z przytroczonej sakiewki');
    return true;
  });

  // otm1 - take coins from worn bag
  api.aliases.register(/^otm1$/, () => {
    api.command.send('wyj monety');
    return true;
  });

  // ztm - close coin pouch
  api.aliases.register(/^ztm$/, () => {
    api.command.send('zamknij przytroczona sakiewke');
    return true;
  });

  // ztm1 - sort coins in attached pouch (shake out copper, put all back)
  api.aliases.register(/^ztm1$/, () => {
    api.command.send('otworz przytroczona sakiewke');
    api.command.send('wez miedziane monety z przytroczonej sakiewki');
    api.command.send('odloz miedziane monety');
    api.command.send('wloz monety do przytroczonej sakiewki');
    api.command.send('zamknij przytroczona sakiewke');
    return true;
  });

  // ztm2 - put copper and silver coins into worn bag
  api.aliases.register(/^ztm2$/, () => {
    api.command.send('otworz zalozona torbe');
    api.command.send('wloz miedziane monety do zalozonej torby');
    api.command.send('wloz srebrne monety do zalozonej torby');
    api.command.send('zamknij zalozona torbe');
    return true;
  });

  // zden - denominate coins from worn bag
  api.aliases.register(/^zden$/, () => {
    api.command.send('otworz zalozona torbe');
    api.command.send('wyj monety');
    api.command.send('zdenominuj');
    api.command.send('zamknij zalozona torbe');
    return true;
  });

  // zden2 - denominate coins from ornate backpack
  api.aliases.register(/^zden2$/, () => {
    api.command.send('wez monety z ozdobnego plecaka');
    api.command.send('zdenominuj');
    return true;
  });
}
