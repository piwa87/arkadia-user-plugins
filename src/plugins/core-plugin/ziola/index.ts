import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { cleanupGatherAliases, setupGatherAliases } from './aliases';
import { cleanupPakujZiola } from './pakuj';
import { setupShortcutAliases } from './shortcuts';
import { setupZielarz } from './zielarz';

/**
 * Register herb-related aliases and effect highlights with combined cleanup.
 */
export function setupZiolaAliases(api: PluginApi): () => void {
  const positive = getAnsiFormatState(110, api);
  const negative = getAnsiFormatState(106, api);
  const effects = [
    ['Czujesz', /^Czujesz sie (lepiej|mniej zmeczony|mniej spragniony|bardziej syty)\./, ' + ', positive],
    ['wytrzymaly', /^Czujesz sie bardziej wytrzymaly\./, ' +wyt ', positive],
    ['spragniony', /^Czujesz sie bardziej spragniony\./, ' - prag ', negative],
  ] as const;
  for (const [token, pattern, label, color] of effects) {
    registerTokenGate(api, token, pattern, (line) => {
      const prefix = new api.AnsiAwareBuffer();
      prefix.append(label, color);
      prefix.append(' ');
      return line.prependBuffer(prefix);
    }, 'col_ziola');
  }

  const ids: string[] = [
    ...setupGatherAliases(api),
    ...setupShortcutAliases(api),
  ];
  const cleanupZielarz = setupZielarz(api);

  return () => {
    api.triggers.removeByTag('col_ziola');
    cleanupGatherAliases(api);
    cleanupZielarz();
    cleanupPakujZiola(api);
    ids.forEach((id) => api.aliases.remove(id));
  };
}
