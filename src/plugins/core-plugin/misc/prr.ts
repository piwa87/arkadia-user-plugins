import type { PluginApi } from '@arkadia/plugin-types';
import { stopZielarz } from '../ziola/zielarz';

/** Stop the current action and any active automatic herb-gathering route. */
export function setupPrrAlias(api: PluginApi): void {
  api.aliases.register(/^prr$/i, () => {
    stopZielarz();
    api.command.send('/stop');
    return true;
  });
}
