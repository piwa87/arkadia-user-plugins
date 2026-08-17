import type { PluginApi } from '@arkadia/plugin-types';
import { createMorzeState, type MorzeState } from './state';
import { setupMorzeTriggers } from './triggers';
import { setupMorzeAliases } from './aliases';

/**
 * Combined setup for all sea/diving/pearl modules.
 * Creates shared state, wires triggers + aliases.
 */
export function setupMorze(api: PluginApi): () => void {
  const state = createMorzeState();
  const cleanupTriggers = setupMorzeTriggers(api, state);
  setupMorzeAliases(api, state);

  // ── Module toggle: mr+ / mr- ──────────────────────────────────────────
  api.aliases.register(/^mr\+$/i, () => {
    state.enabled = true;
    api.output.print('[Morze] module enabled');
    return true;
  });

  api.aliases.register(/^mr-$/i, () => {
    state.enabled = false;
    api.output.print('[Morze] module disabled');
    return true;
  });

  return () => {
    cleanupTriggers();
  };
}

export { createMorzeState };
export type { MorzeState };
