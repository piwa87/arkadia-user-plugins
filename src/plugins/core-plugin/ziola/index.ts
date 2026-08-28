import type { PluginApi } from '@arkadia/plugin-types';
import { setupGatherAliases } from './aliases';
import { cleanupPakujZiola } from './pakuj';
import { setupShortcutAliases } from './shortcuts';
import { setupZielarz } from './zielarz';

/**
 * Register all herb-related aliases and return a combined cleanup function.
 */
export function setupZiolaAliases(api: PluginApi): () => void {
  const ids: string[] = [
    ...setupGatherAliases(api),
    ...setupShortcutAliases(api),
  ];
  const cleanupZielarz = setupZielarz(api);

  return () => {
    cleanupZielarz();
    cleanupPakujZiola(api);
    ids.forEach((id) => api.aliases.remove(id));
  };
}
