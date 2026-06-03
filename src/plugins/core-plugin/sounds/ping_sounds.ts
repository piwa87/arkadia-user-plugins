import type { PluginApi } from '@arkadia/plugin-types';

const TAG = 'pingSounds';

export function setupPingSounds(api: PluginApi): void {
  // Experience progress report
  api.triggers.register(
    /Poczynil(?:es|as) (.*) postepy, od momentu kiedy .* gry\.$/,
    (line) => {
      api.command.send('play_ping');
      return line;
    },
    TAG,
  );
}
