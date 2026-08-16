import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../../lib/registerTextAlias';

/**
 * Simple one-liner aliases: look, hide, hood, candle, browse, who, point,
 * message, danger, sell, log mark, reload, patrol count.
 */
export function setupQuickAliases(api: PluginApi): void {
  // ze - quick look (optional direction)
  registerTextAlias(api, /^ze(?:\s+(.+))?$/, 'zerknij');

  // hi - hide
  registerTextAlias(api, /^hi$/, 'schowaj');

  // ooo - pull down hood
  registerTextAlias(api, /^ooo$/, 'sciagnij kaptur');

  // ++ - light candle
  registerTextAlias(api, /^\+\+$/, 'zapal swiece');

  // ´´ - extinguish candle
  registerTextAlias(api, /^´´$/, 'zdmuchnij swiece');

  // pjpb - quick browse
  registerTextAlias(api, /^pjpb$/, 'przejrzyj pobieznie');

  // kt - who is online
  registerTextAlias(api, /^kt$/, 'kto');

  // wj - point at (optional target)
  registerTextAlias(api, /^wj(?:\s+(.+))?$/, 'wskaz');

  // sig <text> - print styled message to output
  api.aliases.register(/^sig(?:\s+(.+))?$/, (matches) => {
    const text = matches?.[1]?.trim() ?? '';
    api.output.print(`--> ${text}`);
    return true;
  });

  // przepasc! - loud warning about a chasm
  api.aliases.register(/^przepasc!$/, () => {
    api.output.print('  TAM PRZEPASC!  ');
    return true;
  });

  // < <item> - sell item
  registerTextAlias(api, /^<(?:\s+(.+))?$/, 'sprzedaj');

  // logg - mark an interesting section in the log
  api.aliases.register(/^logg$/, () => {
    api.output.print('');
    api.output.print('');
    api.output.print('OKOLICE CIEKAWEGO MIEJSCA W LOGU');
    api.output.print('');
    return true;
  });

  // rp! - reload plugins
  registerTextAlias(api, /^rp\!/, '/reload-plugins');

  // liczpatrol - count patrol members
  api.aliases.register(/^liczpatrol$/, () => {
    api.command.send('policz pikinierow');
    api.command.send('policz tarczownikow');
    api.command.send('policz sierzantow');
    api.command.send('policz chorazych');
    return true;
  });
}
