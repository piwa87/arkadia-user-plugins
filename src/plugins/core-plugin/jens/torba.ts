import type { PluginApi } from '@arkadia/plugin-types';
import { setupWornContainerAliases } from '../worn_container';

/** Worn-bag (torba) aliases for jens. Returns a cleanup function. */
export function setupTorbaAliases(api: PluginApi): () => void {
  return setupWornContainerAliases(api, {
    acc: 'zalozona torbe',
    gen: 'zalozonej torby',
  });
}
