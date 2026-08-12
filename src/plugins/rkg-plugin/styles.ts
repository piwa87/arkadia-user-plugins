import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';

/** The four visual roles RKG uses in game output. */
export interface RkgStyles {
  info: FormatStateSnapshot;
  clubName: FormatStateSnapshot;
  role: FormatStateSnapshot;
  action: FormatStateSnapshot;
}

/**
 * Build RKG's small, semantic palette once during plugin initialisation.
 *
 * The palette keeps routine information quiet, uses cool blue for role data,
 * and spends its strongest gold-on-green contrast only on the generated name.
 */
export function createRkgStyles(api: PluginApi): RkgStyles {
  const info = api.colors.fromHex('#82909d');
  const accent = api.colors.fromHex('#f2c14e');
  const role = api.colors.fromHex('#82acd1');
  const clubBackground = api.colors.fromHex('#173d2d');

  return {
    info,
    clubName: {
      ...accent,
      background: clubBackground.foreground,
      bold: true,
    },
    role,
    action: { ...accent, bold: true },
  };
}
