import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../../lib/registerTextAlias';

/**
 * Register quick shortcuts for herb-related game interface commands.
 *
 * Zestawy (herb kits):
 * - `hp+` / `lec9`  → `/zestaw hp`
 * - `mana+`         → `/zestaw mana`
 * - `st+` / `l2boost` → `/zestaw sterydy`
 * - `zm+` / `reg9`  → `/zestaw zm`
 *
 * Other:
 * - `obz`  → `/ziola`
 * - `zi`   → `/zio_szukaj`
 * - `obz!` → wyj woreczki + `/ziola` + `/ziola_buduj`
 */
export function setupShortcutAliases(api: PluginApi): string[] {
  const ids: string[] = [];

  // Zestawy
  ids.push(registerTextAlias(api, /^hp\+$/i, '/zestaw hp'));
  ids.push(registerTextAlias(api, /^lec9$/i, '/zestaw hp'));
  ids.push(registerTextAlias(api, /^mana\+$/i, '/zestaw mana'));
  ids.push(registerTextAlias(api, /^st\+$/i, '/zestaw sterydy'));
  ids.push(registerTextAlias(api, /^l2boost$/i, '/zestaw sterydy'));
  ids.push(registerTextAlias(api, /^zm\+$/i, '/zestaw zm'));
  ids.push(registerTextAlias(api, /^reg9$/i, '/zestaw zm'));

  // Pozostale
  ids.push(registerTextAlias(api, /^obz$/i, '/ziola'));
  ids.push(registerTextAlias(api, /^zi$/i, '/zio_szukaj'));

  ids.push(
    api.aliases.register(/^obz!$/i, () => {
      api.command.send('wyj woreczki');
      api.command.send('/ziola');
      api.command.send('/ziola_buduj');
      return true;
    }),
  );

  return ids;
}