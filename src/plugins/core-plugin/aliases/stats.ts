import type { PluginApi } from '@arkadia/plugin-types';

export function setupStatsAliases(api: PluginApi): void {
  // #region stat
  api.aliases.register(/^stat$/, () => {
    api.command.send('/zabici');
    return true;
  });

  // #region stat2
  api.aliases.register(/^stat2$/, () => {
    api.command.send('/zabici2');
    return true;
  });

  // #region pos
  api.aliases.register(/^pos$/, () => {
    api.command.send('/postepy');
    return true;
  });

  // #region pos2
  api.aliases.register(/^pos2$/, () => {
    api.command.send('/postepy2');
    return true;
  });
}
