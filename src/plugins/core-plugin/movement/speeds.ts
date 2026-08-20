import type { PluginApi } from '@arkadia/plugin-types';

export function setupMovementSpeedAliases(api: PluginApi): void {
  const speeds: Record<string, string> = {
    '1': 'niespiesznie',
    '2': 'marszem',
    '3': 'truchtem',
    '4': 'biegiem',
    '5': 'szybkim biegiem',
  };

  api.aliases.register(/^i([1-5])$/, (matches) => {
    const speed = speeds[matches![1]];
    if (speed) api.command.send(`idz ${speed}`);
    return true;
  });
}
