import type { PluginApi } from '@arkadia/plugin-types';

const TAG = 'dingSounds';

export function setupDingSounds(api: PluginApi): void {
  // Experience progress report
  api.triggers.register(
    /Poczynil(?:es|as) (.*) postepy, od momentu kiedy .* gry\.$/,
    (line) => {
      api.command.send('play_ding');
      return line;
    },
    TAG,
  );
}
