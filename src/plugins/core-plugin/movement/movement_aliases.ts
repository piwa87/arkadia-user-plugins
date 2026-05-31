import type { PluginApi } from '@arkadia/plugin-types';

export function setupMovementAliases(api: PluginApi): void {
  api.aliases.register(/^pp-$/i, () => {
    api.command.send('/pre_walk-');
    api.command.send('/post_walk-');
    return true;
  });
}
