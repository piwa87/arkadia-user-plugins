import type { PluginApi } from '@arkadia/plugin-types';

export function setupTeamAliases(api: PluginApi): void {
  // ps - introduce yourself
  api.aliases.register(/^ps$/, () => {
    api.command.send('przedstaw sie');
    return true;
  });

  // ws - support/buff ally
  api.aliases.register(/^ws$/, () => {
    api.command.send('wesprzyj');
    return true;
  });

  // xxx - stop fighting
  api.aliases.register(/^xxx$/, () => {
    api.command.send('przestan walczyc');
    return true;
  });

  // pd - leave team
  api.aliases.register(/^pd$/, () => {
    api.command.send('porzuc druzyne');
    api.command.send('druzyna');
    return true;
  });

  // xx - stop shielding
  api.aliases.register(/^xx$/, () => {
    api.command.send('przestan zaslaniac');
    return true;
  });

  // xxb - stop blocking
  api.aliases.register(/^xxb$/, () => {
    api.command.send('przestan blokowac');
    return true;
  });

  // xxc - stop reading
  api.aliases.register(/^xxc$/, () => {
    api.command.send('przestan czytac');
    return true;
  });

  // xp - stop current action
  api.aliases.register(/^xp$/, () => {
    api.command.send('przestan');
    return true;
  });

  // obd - inspect team
  api.aliases.register(/^obd$/, () => {
    api.command.send('ob druzyne');
    return true;
  });

  // pm - sneak
  api.aliases.register(/^pm$/, () => {
    api.command.send('przemknij');
    return true;
  });

  // pmd - sneak with team
  api.aliases.register(/^pmd$/, () => {
    api.command.send('przemknij z druzyna');
    return true;
  });
}
