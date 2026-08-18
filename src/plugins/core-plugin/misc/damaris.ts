import type { PluginApi } from '@arkadia/plugin-types';
import { registerTempTrigger } from '../../../lib/registerTempTrigger';
import { withDelay } from '../../../lib/withDelay';

const TAG = 'damaris';

/**
 * xdam – arm a one-shot trigger for "wytraca ci":
 * when the trigger fires, after a random delay, move north,
 * draw weapon, move south, and attack a bandit.
 */
export function setupDamarisAlias(api: PluginApi): void {
  api.aliases.register(/^xdam$/, () => {
    registerTempTrigger(
      api,
      /wytraca ci/i,
      368,
      987,
      () => {
        api.command.send('dobadz broni');
        api.command.send('n');
        api.command.send('s');
        api.command.send('c zboja');
      },
      TAG,
    );
    api.output.print('[xdam] armed');
    return true;
  });
}
