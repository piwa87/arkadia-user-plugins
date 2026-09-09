import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../../lib/registerTextAlias';

export function setupTravelAliases(api: PluginApi): void {
  // #region op - board transport: open pouch, buy ticket, board, close pouch
  api.aliases.register(/^op$/, () => {
    api.command.send('na_statek');
    api.command.send('otm');
    api.command.send('kup bilet');
    api.command.send('wejdz na tratwe');
    api.command.send('wejdz na statek');
    api.command.send('ztm');
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
    api.command.send('wsiadz do dylizansu');
    api.command.send('wsiadz do wozu');
    api.command.send('wsiadz do powozu');
    api.command.send('ztm');
    return true;
  });

  // #region test-arrival
  registerTextAlias(api, /^test-arrival$/, '/fake --> Statek z wolna doplywa do brzegu.');
}
