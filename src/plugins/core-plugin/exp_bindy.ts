import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';
import { registerTextAlias } from '../../lib/registerTextAlias';

export function setupBattleAliases(api: PluginApi): void {
  // #region b_wsiowe
  api.aliases.register(/^b_wsiowe$/, () => {
    api.command.send('set1 snotlinga');
    api.command.send('set2 goblina');
    api.command.send('set3 orka');
    api.command.send('set4 snotlinga');
    return true;
  });

  // #region bakb
  api.aliases.register(/^bakb$/, () => {
    api.command.send('set1 pierwszego zolnierza');
    api.command.send('set2 drugiego zolnierza');
    api.command.send('set3 zimnookiego zolnierza');
    api.command.send('set4 dowodce');
    return true;
  });

  // #region bbod
  api.aliases.register(/^bbod$/, () => {
    api.command.send('set1 pikiniera');
    api.command.send('set2 zolnierza');
    api.command.send('set3 sierzanta');
    api.command.send('set4 oficera');
    return true;
  });

  // #region bcz
  registerTextAlias(api, /^bcz$/, 'set czlowieka');

  // #region bgb
  registerTextAlias(api, /^bgb$/, 'set goblinoida');

  // #region bgrz
  registerTextAlias(api, /^bgrz$/, 'set grzyboczleka');

  // #region bhas
  registerTextAlias(api, /^bhas$/, 'set krasnoluda chaosu');

  // #region bjas
  registerTextAlias(api, /^bjas$/, 'set jaszczuroczleka');

  // #region bkis
  registerTextAlias(api, /^bkis$/, 'set kislevite');

  // #region bkur
  api.aliases.register(/^bkur$/, () => {
    api.command.send('set nieumarlego');
    api.command.send('set3 barghesta');
    api.command.send('set4 upiora');
    return true;
  });

  // #region bryb
  registerTextAlias(api, /^bryb$/, 'set ryboczleka');

  // #region bstr
  registerTextAlias(api, /^bstr$/, 'set straznika');

  // #region bszcz
  registerTextAlias(api, /^bszcz$/, 'set szczuroczleka');

  // #region bu
  registerTextAlias(api, /^bu$/, 'set nieumarlego');

  // #region bwy
  registerTextAlias(api, /^bwy$/, 'set wyverne');

  // #region bzbo
  registerTextAlias(api, /^bzbo$/, 'set zboja');

  // #region bzol
  registerTextAlias(api, /^bzol$/, 'set zolnierza');

  // #region next! - visual "N E X T" banner after an enemy dies
  {
    const nextColor = getAnsiFormatState(37, api);
    const nextText = ' '.repeat(12) + 'N E X T' + ' '.repeat(100);

    api.aliases.register(/^next!$/, () => {
      const buf = new api.AnsiAwareBuffer(nextText);
      buf.color([0, nextText.length], nextColor);
      api.output.print(buf);
      api.output.print('');
      return true;
    });
  }
}
