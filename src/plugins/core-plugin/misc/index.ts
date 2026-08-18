import type { PluginApi } from '@arkadia/plugin-types';
import { setupMaketempAlias } from './maketemp';
import { setupSzukAlias } from './szuk';
import { setupQuickAliases } from './quick';
import { setupMiscMovementAliases } from './movement';
import { setupInteractionAliases } from './interactions';
import { setupTimerAliases } from './timer';
import { setupZakrecAlias } from './zakrec';
import { setupKeysAlias } from './keys';

export function setupMiscAliases(api: PluginApi): void {
  setupMaketempAlias(api);
  setupSzukAlias(api);
  setupQuickAliases(api);
  setupMiscMovementAliases(api);
  setupInteractionAliases(api);
  setupTimerAliases(api);
  setupZakrecAlias(api);
  setupKeysAlias(api);
}
