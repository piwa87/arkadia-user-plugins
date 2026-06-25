import type { PluginApi } from '@arkadia/plugin-types';
import { setupWornContainerAliases } from '../worn_container';

/** Worn-backpack (plecak) aliases for gertruda. Returns a cleanup function. */
export function setupPlecakAliases(api: PluginApi): () => void {
  return setupWornContainerAliases(api, {
    acc: 'zalozony plecak',
    gen: 'zalozonego plecaka',
  });
}
