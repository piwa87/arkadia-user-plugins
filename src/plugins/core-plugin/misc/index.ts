import type { PluginApi } from '@arkadia/plugin-types';
import { setupMaketempAlias } from './maketemp';
import { setupSzukAlias } from './szuk';
import { setupQuickAliases } from './quick';
import { setupMiscMovementAliases } from './movement';
import { setupInteractionAliases } from './interactions';
import { setupTimerAliases } from './timer';
import { setupZakrecAlias } from './zakrec';
import { setupKeysAlias } from './keys';
import { setupDamarisAlias } from './damaris';

export function setupMiscAliases(api: PluginApi): void {
  setupDamarisAlias(api);
  setupMaketempAlias(api);
  setupSzukAlias(api);
  setupQuickAliases(api);
  setupMiscMovementAliases(api);
  setupInteractionAliases(api);
  setupTimerAliases(api);
  setupZakrecAlias(api);
  setupKeysAlias(api);
}
