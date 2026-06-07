import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupEventTriggers } from './triggers/events';
import { setupZaslonTriggers } from './triggers/zaslon-triggers';
import { setupLocationTriggers } from './triggers/location';
import { setupMiscTriggers } from './triggers/misc';
import { setupFooter } from './ui/footer';
import { setupTravelAliases } from './travel/travel_aliases';
import { setupWsiadaczAliases } from './travel/wsiadacz';
import { setupCombatAliases } from './walka/walka_aliasy';
import { setupBattleAliases } from './aliases/exp_bindy';
import { setupAtakiTriggers } from './walka/atak_triggers';
import { setupAtakPyk } from './walka/atak_pyk';
import { setupPartyShieldAliases } from './walka/walka_zaslony';
import { setupCiosyKolory } from './colors/col_ciosy';
import { setupEmoteAliases } from './jens/emotes';
import { setupPalenie } from './jens/palenie';
import { setupEquipmentAliases } from './aliases/equipment';
import { setupLampAliases } from './aliases/lampa';
import { setupMieszekAliases } from './aliases/mieszek';
import { setupOptionsAliases } from './aliases/options';
import { setupHelpAliases } from './aliases/help';
import { setupBindAliases } from './aliases/f';
import { setupMapAliases } from './aliases/map';
import { setupDebugAliases } from './aliases/debug';
import { setupTeamAliases } from './aliases/team';
import { setupBuklakAliases } from './aliases/buklak';
import { setupLocationsAliases } from './aliases/locations';
import { setupMiscAliases } from './aliases/misc';
import { setupStatsAliases } from './aliases/stats';
import { setupPostAliases } from './aliases/poczta';
import { setupLootAliases } from './aliases/loot';
import { createKondycjeState, setupKondycjeTriggers } from './kondycje/kondycje_triggers';
import { setupKondycjeAliases } from './kondycje/kondycje_aliases';
import { createZmeczenieState, setupZmeczenieTriggers } from './kondycje/zmeczenie_triggers';
import { setupBramyTriggers } from './bramy/bramy_triggers';
import { setupBramyAliases } from './bramy/bramy_aliases';
import { createCombatState, setupGmcpCombat } from './gmcp-combat/combat-state';
import { megaphone, setupMgfnAlias } from './aliases/mgfn';
import { createDobywanieState, setupDobywanieAliases } from './dobywanie/dobywanie_aliases';
import { setupMovementAliases } from './movement/movement_aliases';
import { setupKeyboardBindings, teardownKeyboardBindings, setCenterCommand } from './movement/movement_binds';
import { setupTmpk } from './tmpk/tmpk';
import { setupColActions } from './colors/col_actions';
import { setupColCialo } from './colors/col_cialo';
import { setupColEkwipunek } from './colors/col_ekwipunek';
import { setupColEventy } from './colors/col_eventy';
import { setupGlassSounds } from './sounds/glass_sound';
import { setupPingSounds } from './sounds/ping_sounds';
import { storage } from '../../lib/storage';

let cleanupCombat: (() => void) | null = null;
let cleanupPalenie: (() => void) | null = null;
let cleanupAtakPyk: (() => void) | null = null;

export async function init(api: PluginApi): Promise<PluginInfo> {
const ORDINALS = ['', '2. ', '3. ', '4. '];
  const targets = storage.get<string[]>('targets') ?? ['INIT', 'cel2', 'cel3', 'cel4'];

  // Set up footer component (needs targets by reference)
  const { update: updateFooter } = setupFooter(api, targets);

  // Wire up all alias modules
  setupBattleAliases(api);
  setupCombatAliases(api, targets, ORDINALS, updateFooter);
  setupEmoteAliases(api);
  cleanupPalenie = setupPalenie(api);
  setupEquipmentAliases(api);
  setupLampAliases(api);
  setupMieszekAliases(api);
  setupOptionsAliases(api);
  setupTravelAliases(api);
  setupWsiadaczAliases(api);
  setupHelpAliases(api);
  setupBindAliases(api);
  setupDebugAliases(api);
  setupMapAliases(api);
  setupTeamAliases(api);
  setupBuklakAliases(api);
  setupLocationsAliases(api);
  setupMiscAliases(api);
  setupStatsAliases(api);
  setupPostAliases(api);
  setupLootAliases(api);
  const dobywanieState = createDobywanieState();
  setupDobywanieAliases(api, dobywanieState);
  setupMovementAliases(api);
  setupKeyboardBindings(api);
  setCenterCommand('c');
  setupTmpk(api);
  setupColActions(api);
  setupColCialo(api);
  setupColEkwipunek(api);
  setupColEventy(api);
  setupGlassSounds(api);
  setupPingSounds(api);

  // Kondycje (HP condition) state — created early so other triggers can read it
  const kondycjeState = createKondycjeState();

  // Set up event triggers (alarms, undead warnings, etc.)
  setupEventTriggers(api);
  setupAtakiTriggers(api, kondycjeState);
  setupPartyShieldAliases(api);
  cleanupAtakPyk = setupAtakPyk(api);
  setupCiosyKolory(api);
  setupZaslonTriggers(api);
  setupLocationTriggers(api);
  setupMiscTriggers(api);

  // Set up kondycje (HP condition) triggers and aliases
  setupKondycjeTriggers(api, kondycjeState);
  setupKondycjeAliases(api, kondycjeState);

  const zmeczenieState = createZmeczenieState();
  setupZmeczenieTriggers(api, zmeczenieState);

  // Set up bramy (gates/doors) triggers and aliases
  setupBramyTriggers(api);
  setupBramyAliases(api);

  // Megaphone alias — must be registered before combat engine (darkness handler uses it)
  setupMgfnAlias(api);

  // Set up GMCP combat state engine
  const combatState = createCombatState();
  cleanupCombat = setupGmcpCombat(api, combatState, () => megaphone(api, 'ciemno'));

  const info: PluginInfo = {
    name: 'Core Plugin',
    version: '0.3.1',
    author: 'Piot',
    description: 'W wsumie wszystko ważne...',
  };
  api.output.print(`[${info.name} v${info.version}] loaded`);
  return info;
}

export async function destroy(): Promise<void> {
  cleanupCombat?.();
  cleanupCombat = null;
  cleanupPalenie?.();
  cleanupPalenie = null;
  cleanupAtakPyk?.();
  cleanupAtakPyk = null;
  teardownKeyboardBindings();
}
