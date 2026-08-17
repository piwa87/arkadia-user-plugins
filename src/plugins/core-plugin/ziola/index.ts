import type { PluginApi } from '@arkadia/plugin-types';
import { setupGatherAliases } from './aliases';
import { setupShortcutAliases } from './shortcuts';

/**
 * Register all herb-related aliases and return a combined cleanup function.
 */
export function setupZiolaAliases(api: PluginApi): () => void {
  const ids: string[] = [
    ...setupGatherAliases(api),
    ...setupShortcutAliases(api),
  ];

  return () => {
    ids.forEach((id) => api.aliases.remove(id));
  };
}