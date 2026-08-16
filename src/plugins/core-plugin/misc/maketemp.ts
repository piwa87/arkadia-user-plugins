import type { PluginApi } from '@arkadia/plugin-types';
import { makeTemp } from '../../../lib/makeTemp';

/**
 * maketemp <pattern> <cmd1;cmd2;...>
 * Arms a one-shot trigger: fires commands once when pattern appears in output.
 */
export function setupMaketempAlias(api: PluginApi): void {
  api.aliases.register(/^maketemp\s+(\S+)\s+(.+)$/, (matches) => {
    makeTemp(api, matches![1], matches![2]);
    return true;
  });
}
