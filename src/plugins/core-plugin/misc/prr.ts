import type { PluginApi } from '@arkadia/plugin-types';
import { stopSequences } from '../../../lib/sequenceStop';
import { stopPyk } from '../pyk/pyk';
import { stopZielarz } from '../ziola/zielarz';

/** Stop the current action and any active automatic herb-gathering route, and disable PYK. */
export function setupPrrAlias(api: PluginApi): void {
  api.aliases.register(/^prr$/i, () => {
    stopSequences(api);
    stopPyk();
    stopZielarz();
    api.command.send('/stop');
    return true;
  });
}
