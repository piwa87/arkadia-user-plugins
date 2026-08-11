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
 * These values preserve the old CMud ANSI 3/110/11/14 appearance without
 * importing and constructing the shared 128-entry ANSI palette.
 */
export function createRkgStyles(api: PluginApi): RkgStyles {
  const info = api.colors.fromHex('#a6a6a6');
  const neutral = api.colors.fromHex('#c0c0c0');
  const role = api.colors.fromHex('#85a5cb');
  const clubBackground = api.colors.fromHex('#0e451c');

  return {
    info,
    clubName: {
      ...neutral,
      background: clubBackground.foreground,
    },
    role,
    action: neutral,
  };
}
