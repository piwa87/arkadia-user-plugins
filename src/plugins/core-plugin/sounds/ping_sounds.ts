import type { PluginApi } from '@arkadia/plugin-types';
import { registerTokenGate } from '../../../lib/registerTokenGate';

const TAG = 'pingSounds';

export function setupPingSounds(api: PluginApi): void {
  // Experience progress report
  registerTokenGate(
    api,
    ['poczyniles', 'poczynilas'],
    /Poczynil(?:es|as) (.*) postepy, od momentu kiedy .* gry\.$/,
    (line) => {
      api.command.send('play_ping');
      return line;
    },
    TAG,
  );
}
