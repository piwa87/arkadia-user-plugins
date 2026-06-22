import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import {
  setupBramy,
  setupBuklakAliases,
  setupColCialo,
  setupCiosyKolory,
  setupColEkwipunek,
  setupColEventy,
  setupColMovements,
  setupDebugAliases,
  createDobywanieState,
  setupDobywanieAliases,
  setupDooAliases,
  setupEquipmentAliases,
  setupBattleAliases,
  setupBindAliases,
  createCombatState,
  setupGmcpCombat,
  setupHelpAliases,
  setupEmoteAliases,
  setupPalenie,
  setupKarczmaAliases,
  setupKondycjeAliases,
  createKondycjeState,
  setupKondycjeTriggers,
  setupHpBar,
  createZmeczenieState,
  setupZmeczenieTriggers,
  setupLampAliases,
  setupLocationsAliases,
  setupLootAliases,
  setupMapAliases,
  megaphone,
  setupMgfnAlias,
  setupMieszekAliases,
  setupMiscAliases,
  setupMovementAliases,
  setupKeyboardBindings,
  teardownKeyboardBindings,
  setCenterCommand,
  setupOptionsAliases,
  setupPostAliases,
  setupGlassSounds,
  setupPingSounds,
  setupStatsAliases,
  setupTeamAliases,
  setupTmpk,
  setupTravelAliases,
  setupWsiadaczAliases,
  setupEventTriggers,
  setupLocationTriggers,
  setupMiscTriggers,
  setupZaslonTriggers,
  setupFooter,
  setupAtakPyk,
  setupAtakiTriggers,
  setupCombatAliases,
  setupPartyShieldAliases,
  setupWalker,
  setupZaslony,
  setupZiolaAliases,
  storage,
} from './modules';

let cleanupCombat: (() => void) | null = null;
let cleanupPalenie: (() => void) | null = null;
let cleanupAtakPyk: (() => void) | null = null;
let cleanupWalker: (() => void) | null = null;
let cleanupZiola: (() => void) | null = null;
let cleanupHpBar: (() => void) | null = null;

export async function init(api: PluginApi): Promise<PluginInfo> {
  const ORDINALS = ['', '2. ', '3. ', '4. '];
  const targets = storage.get<string[]>('targets') ?? ['INIT', 'cel2', 'cel3', 'cel4'];

  const { update: updateFooter } = setupFooter(api, targets);

  const combatState = createCombatState();
  const dobywanieState = createDobywanieState();
  const kondycjeState = createKondycjeState();
  const zmeczenieState = createZmeczenieState();

  cleanupAtakPyk = setupAtakPyk(api);
  setupAtakiTriggers(api, kondycjeState);
  setupBattleAliases(api);
  setupBindAliases(api);
  setupBramy(api);
  setupBuklakAliases(api);
  setupCiosyKolory(api);
  setupColCialo(api);
  setupColEkwipunek(api);
  setupColEventy(api);
  setupColMovements(api);
  setupCombatAliases(api, targets, ORDINALS, updateFooter);
  setupDebugAliases(api);
  setupDobywanieAliases(api, dobywanieState);
  setupDooAliases(api);
  setupEmoteAliases(api);
  setupEquipmentAliases(api);
  setupEventTriggers(api);
  setupGlassSounds(api);
  setupHelpAliases(api);
  setupKarczmaAliases(api);
  setupKeyboardBindings(api);
  setCenterCommand('c');
  setupKondycjeAliases(api, kondycjeState);
  setupKondycjeTriggers(api, kondycjeState);
  cleanupHpBar = setupHpBar(api);
  setupLampAliases(api);
  setupLocationTriggers(api);
  setupLocationsAliases(api);
  setupLootAliases(api);
  setupMapAliases(api);
  setupMgfnAlias(api);
  setupMieszekAliases(api);
  setupMiscAliases(api);
  setupMiscTriggers(api);
  setupMovementAliases(api);
  setupOptionsAliases(api);
  setupPartyShieldAliases(api);
  cleanupPalenie = setupPalenie(api);
  setupPingSounds(api);
  setupPostAliases(api);
  setupStatsAliases(api);
  setupTeamAliases(api);
  setupTmpk(api);
  setupTravelAliases(api);
  cleanupWalker = setupWalker(api);
  setupWsiadaczAliases(api);
  setupZaslonTriggers(api);
  setupZaslony(api);
  cleanupZiola = setupZiolaAliases(api);
  setupZmeczenieTriggers(api, zmeczenieState);
  cleanupCombat = setupGmcpCombat(api, combatState, () => megaphone(api, 'ciemno'));

  const info: PluginInfo = {
    name: 'Core Plugin',
    version: '0.3.1',
    author: 'Piot',
    description: 'Wszystko wazne, yo!',
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
  cleanupWalker?.();
  cleanupWalker = null;
  cleanupZiola?.();
  cleanupZiola = null;
  cleanupHpBar?.();
  cleanupHpBar = null;
  teardownKeyboardBindings();
}
