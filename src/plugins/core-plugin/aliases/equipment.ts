import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../../lib/registerTextAlias';

export function setupEquipmentAliases(api: PluginApi): void {
  // #region la+
  api.aliases.register(/^la\+$/, () => {
    api.command.send('wyj lampe|olej');
    api.command.send('przytrocz lampe');
    api.command.send('naplam');
    api.command.send('/zap');
    return true;
  });

  // #region la-
  api.aliases.register(/^la-$/, () => {
    api.command.send('/zg');
    api.command.send('odtrocz lampe');
    api.command.send('wlz lampe|oleje');
    return true;
  });

  // #region napt
  api.aliases.register(/^napt$/, () => {
    api.command.send('otworz zalozona torbe');
    api.command.send('napelnij zalozona torbe');
    return true;
  });

  // #region obb
  api.aliases.register(/^obb$/, () => {
    api.command.send('zajrzyj do zalozonej torby');
    return true;
  });

  // #region ot
  api.aliases.register(/^ot$/, () => {
    api.command.send('otworz zalozona torbe');
    return true;
  });

  // #region pj [text]
  registerTextAlias(api, /^pj(?:\s+(.+))?$/, 'przejrzyj');

  // #region pr [text]
  registerTextAlias(api, /^pr(?:\s+(.+))?$/, 'przeczytaj');

  // #region wlz [what]
  api.aliases.register(/^wlz(?:\s+(.+))?$/, (matches) => {
    const text = matches?.[1]?.trim();
    if (!text) return true;
    for (const item of text
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)) {
      api.command.send(`wloz ${item} do zalozonej torby`);
    }
    return true;
  });

  // #region wyj [what]
  api.aliases.register(/^wyj(?:\s+(.+))?$/, (matches) => {
    const text = matches?.[1]?.trim();
    if (!text) return true;
    for (const item of text
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)) {
      api.command.send(`wez ${item} z zalozonej torby`);
    }
    return true;
  });

  // #region zt
  api.aliases.register(/^zt$/, () => {
    api.command.send('zamknij zalozona torbe');
    api.command.send('la+');
    return true;
  });
}
