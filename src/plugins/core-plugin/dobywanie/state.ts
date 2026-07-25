import type { PluginApi } from '@arkadia/plugin-types';

// Character-agnostic "is a weapon in hands?" state shared between each
// character's dobywanie (weapon-drawing) aliases and the `c`/`cc` kill aliases.
//
// The CMUD scripts tracked this with a `gdzie_bron` variable (0 = sheathed,
// 1 = drawn) and every `c` attack first ran `#IF (@gdzie_bron=0) {dob}`. Here
// `drawn` mirrors `gdzie_bron` and `drawCurrent` is the character-specific
// equivalent of the `dob` alias — installed by the per-character setup once the
// character name is known.

export interface DobywanieState {
  /** true = weapon currently in hands (CMUD `gdzie_bron=1`) */
  drawn: boolean;
  /**
   * Draw the character's currently-selected weapon loadout (CMUD `dob`).
   * Defaults to a no-op until the per-character setup installs the real one.
   */
  drawCurrent: (api: PluginApi) => void;
}

export function createDobywanieState(): DobywanieState {
  return { drawn: false, drawCurrent: () => {} };
}

/**
 * Draw the selected weapon if it isn't already in hands.
 * CMUD `#IF (@gdzie_bron=0) {dob}` — used by the `c` killing alias so an attack
 * auto-fetches weapons first. `drawn` is maintained by the dob/opu aliases.
 */
export function ensureWeaponDrawn(api: PluginApi, state: DobywanieState): void {
  if (!state.drawn) state.drawCurrent(api);
}
