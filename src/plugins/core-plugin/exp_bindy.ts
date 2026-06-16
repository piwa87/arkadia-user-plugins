import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';

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
  api.aliases.register(/^bcz$/, () => {
    api.command.send('set czlowieka');
    return true;
  });

  // #region bgb
  api.aliases.register(/^bgb$/, () => {
    api.command.send('set goblinoida');
    return true;
  });

  // #region bgrz
  api.aliases.register(/^bgrz$/, () => {
    api.command.send('set grzyboczleka');
    return true;
  });

  // #region bhas
  api.aliases.register(/^bhas$/, () => {
    api.command.send('set krasnoluda chaosu');
    return true;
  });

  // #region bjas
  api.aliases.register(/^bjas$/, () => {
    api.command.send('set jaszczuroczleka');
    return true;
  });

  // #region bkis
  api.aliases.register(/^bkis$/, () => {
    api.command.send('set kislevite');
    return true;
  });

  // #region bkur
  api.aliases.register(/^bkur$/, () => {
    api.command.send('set nieumarlego');
    api.command.send('set3 barghesta');
    api.command.send('set4 upiora');
    return true;
  });

  // #region bryb
  api.aliases.register(/^bryb$/, () => {
    api.command.send('set ryboczleka');
    return true;
  });

  // #region bstr
  api.aliases.register(/^bstr$/, () => {
    api.command.send('set straznika');
    return true;
  });

  // #region bszcz
  api.aliases.register(/^bszcz$/, () => {
    api.command.send('set szczuroczleka');
    return true;
  });

  // #region bu
  api.aliases.register(/^bu$/, () => {
    api.command.send('set nieumarlego');
    return true;
  });

  // #region bwy
  api.aliases.register(/^bwy$/, () => {
    api.command.send('set wyverne');
    return true;
  });

  // #region bzbo
  api.aliases.register(/^bzbo$/, () => {
    api.command.send('set zboja');
    return true;
  });

  // #region bzol
  api.aliases.register(/^bzol$/, () => {
    api.command.send('set zolnierza');
    return true;
  });

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
