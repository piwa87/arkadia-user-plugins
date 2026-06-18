import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../lib/registerTextAlias';

export function setupTeamAliases(api: PluginApi): void {
  // ps - introduce yourself
  registerTextAlias(api, /^ps$/, 'przedstaw sie');

  // ws - support/buff ally
  registerTextAlias(api, /^ws$/, 'wesprzyj');

  // xxx - stop fighting
  registerTextAlias(api, /^xxx$/, 'przestan walczyc');

  // pd - leave team
  api.aliases.register(/^pd$/, () => {
    api.command.send('porzuc druzyne');
    api.command.send('druzyna');
    return true;
  });

  // xx - stop shielding
  registerTextAlias(api, /^xx$/, 'przestan zaslaniac');

  // xxb - stop blocking
  registerTextAlias(api, /^xxb$/, 'przestan blokowac');

  // xxc - stop reading
  registerTextAlias(api, /^xxc$/, 'przestan czytac');

  // xp - stop current action
  registerTextAlias(api, /^xp$/, 'przestan');

  // obd - inspect team
  registerTextAlias(api, /^obd$/, 'ob druzyne');

  // pm - sneak
  registerTextAlias(api, /^pm$/, 'przemknij');

  // pmd - sneak with team
  registerTextAlias(api, /^pmd$/, 'przemknij z druzyna');
}
