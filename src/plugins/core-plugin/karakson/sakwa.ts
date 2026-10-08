import type { PluginApi } from '@arkadia/plugin-types';
import { setupWornContainerAliases } from '../worn_container';

/** Worn-satchel (sakwa) aliases for Karakson. Returns a cleanup function. */
export function setupSakwaAliases(api: PluginApi): () => void {
  return setupWornContainerAliases(api, {
    acc: 'zalozona sakwe',
    gen: 'zalozonej sakwy',
  });
}
