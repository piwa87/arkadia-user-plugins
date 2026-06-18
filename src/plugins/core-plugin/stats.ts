import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../lib/registerTextAlias';

export function setupStatsAliases(api: PluginApi): void {
  // #region stat
  registerTextAlias(api, /^stat$/, '/zabici');

  // #region stat2
  registerTextAlias(api, /^stat2$/, '/zabici2');

  // #region pos
  registerTextAlias(api, /^pos$/, '/postepy');

  // #region pos2
  registerTextAlias(api, /^pos2$/, '/postepy2');
}
