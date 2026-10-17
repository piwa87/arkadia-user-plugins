import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../../lib/registerTextAlias';

export function setupTravelAliases(api: PluginApi): void {
  // The client can bind these commands directly, without going through opw.
  api.commandHooks.register((command: string, echo?: boolean) => {
    if (echo === false || !/^wsiadz do (?:dylizansu|wozu|powozu)$/i.test(command)) return undefined;
    void api.command.send(command, false);
    return null;
  });

  // #region op - board transport: open pouch, buy ticket, board, close pouch
  api.aliases.register(/^op$/, () => {
    api.command.send('na_statek', false);
    api.command.send('wem', false);
    api.command.send('kup bilet', false);
    api.command.send('wejdz na tratwe', false);
    api.command.send('wejdz na statek', false);
    api.command.send('wlm', false);
    return true;
  });

  // #region ned - disembark from raft or ship
  api.aliases.register(/^ned$/, () => {
    api.command.send('zejdz z tratwy');
    api.command.send('zejdz ze statku');
    return true;
  });

  // #region opw - board wagon transport: open pouch, board, close pouch
  api.aliases.register(/^opw$/, () => {
    api.command.send('otm');
    api.command.send('wsiadz do dylizansu', false);
    api.command.send('wsiadz do wozu', false);
    api.command.send('wsiadz do powozu', false);
    api.command.send('ztm');
    return true;
  });

  // #region test-arrival
  registerTextAlias(api, /^test-arrival$/, '/fake --> Statek z wolna doplywa do brzegu.');
}
