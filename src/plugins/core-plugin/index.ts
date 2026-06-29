import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import {
  setupBramy,
  setupBronieAliases,
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
  setupJensEmotes,
  setupPalenie,
  setupTorbaAliases,
  setupGertrudaEmotes,
  setupPlecakAliases,
  onCharName,
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
  setupFooter,
  setupAtakPyk,
  setupAtakiTriggers,
  setupCombatAliases,
  setupPartyShieldAliases,
  setupWalker,
  setupZiolaAliases,
  storage,
} from './modules';

let cleanupCombat: (() => void) | null = null;
let cleanupPalenie: (() => void) | null = null;
let cleanupAtakPyk: (() => void) | null = null;
let cleanupWalker: (() => void) | null = null;
let cleanupZiola: (() => void) | null = null;
let cleanupHpBar: (() => void) | null = null;
let cleanupCharName: (() => void) | null = null;
let cleanupTorba: (() => void) | null = null;
let cleanupPlecak: (() => void) | null = null;

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
  setupBronieAliases(api);
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
  setupPingSounds(api);
  setupPostAliases(api);
  setupStatsAliases(api);
  setupTeamAliases(api);
  setupTmpk(api);
  setupTravelAliases(api);
  cleanupWalker = setupWalker(api);
  setupWsiadaczAliases(api);
  cleanupZiola = setupZiolaAliases(api);
  setupZmeczenieTriggers(api, zmeczenieState);
  cleanupCombat = setupGmcpCombat(api, combatState, () => megaphone(api, 'ciemno'));

  // Character-specific aliases — registered once the char name is known via GMCP.
  cleanupCharName = onCharName(api, (name) => {
    if (name === 'jens') {
      setupJensEmotes(api);
      cleanupPalenie = setupPalenie(api);
      cleanupTorba = setupTorbaAliases(api);
    } else if (name === 'gertruda') {
      setupGertrudaEmotes(api);
      cleanupPlecak = setupPlecakAliases(api);
    }
    api.output.print(`[Core Plugin] character: ${name}`);
  });

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
  cleanupCharName?.();
  cleanupCharName = null;
  cleanupTorba?.();
  cleanupTorba = null;
  cleanupPlecak?.();
  cleanupPlecak = null;
  teardownKeyboardBindings();
}
