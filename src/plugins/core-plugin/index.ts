import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupArrivalTrigger } from './triggers/arrivals';
import { setupEventTriggers } from './triggers/events';
import { setupAtakiTriggers } from './triggers/ataki';
import { setupFooter } from './ui/footer';
import { setupBattleAliases } from './aliases/battle';
import { setupCombatAliases } from './aliases/combat';
import { setupEmoteAliases } from './aliases/emotes';
import { setupEquipmentAliases } from './aliases/equipment';
import { setupOptionsAliases } from './aliases/options';
import { setupTravelAliases } from './aliases/travel';
import { setupHelpAliases } from './aliases/help';
import { setupBindAliases } from './aliases/bind';
import { createKondycjeState, setupKondycjeTriggers } from './kondycje/kondycje_triggers';
import { setupKondycjeAliases } from './kondycje/kondycje_aliases';
import { createZmeczenieState, setupZmeczenieTriggers } from './kondycje/zmeczenie_triggers';

export async function init(api: PluginApi): Promise<PluginInfo> {
  const tag = 'corePlugin';
  const ORDINALS = ['', '2. ', '3. ', '4. '];
  const targets = ['INIT', 'cel2', 'cel3', 'cel4'];

  // Set up footer component (needs targets by reference)
  const { update: updateFooter } = setupFooter(api, targets);

  // Set up arrival trigger (returns armArrivalTrigger helper)
  const { armArrivalTrigger } = setupArrivalTrigger(api, tag);

  // Wire up all alias modules
  setupBattleAliases(api);
  setupCombatAliases(api, targets, ORDINALS, updateFooter);
  setupEmoteAliases(api);
  setupEquipmentAliases(api);
  setupOptionsAliases(api);
  setupTravelAliases(api, armArrivalTrigger);
  setupHelpAliases(api);
  setupBindAliases(api);

  // Set up event triggers (alarms, undead warnings, etc.)
  setupEventTriggers(api);
  setupAtakiTriggers(api);

  // Set up kondycje (HP condition) triggers and aliases
  const kondycjeState = createKondycjeState();
  setupKondycjeTriggers(api, kondycjeState);
  setupKondycjeAliases(api, kondycjeState);

  const zmeczenieState = createZmeczenieState();
  setupZmeczenieTriggers(api, zmeczenieState);

  const info: PluginInfo = {
    name: 'Piot Core',
    version: '0.2.0',
    author: 'Piot',
    description: 'Aliasy, cele i pomocnicze funkcje',
  };
  api.output.print(`[${info.name} v${info.version}] loaded`);
  return info;
}
