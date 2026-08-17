import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import {
  setupBramy,
  setupBrokilon,
  setupBronieAliases,
  setupBuklakAliases,
  setupColCialo,
  setupCiosyKolory,
  setupColEkwipunek,
  setupColEventy,
  setupColMovements,
  setupDebugAliases,
  createDobywanieState,
  setupDooAliases,
  setupEquipmentAliases,
  setupBattleAliases,
  setupBindAliases,
  createCombatState,
  setupGmcpCombat,
  setupHelpAliases,
  setupJensDobywanie,
  setupJensEmotes,
  setupJensMisc,
  setupJensOcenaSprzetu,
  setupPalenie,
  setupTorbaAliases,
  setupGertrudaEmotes,
  setupGertrudaDobywanie,
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
  setupLootShitAliases,
  setupMapAliases,
  setupMorze,
  megaphone,
  setupMgfnAlias,
  setupMieszekAliases,
  setupMiscAliases,
  setupGhoule,
  setupMovementAliases,
  setupKeyboardBindings,
  teardownKeyboardBindings,
  setCenterCommand,
  setupOptionsAliases,
  setupPostAliases,
  setupGlassSounds,
  setupPingSounds,
  setupStatsAliases,
  setupStun,
  setupTeamAliases,
  setupTeam,
  destroyTeam,
  setupTmpk,
  setupTravelAliases,
  setupWsiadaczAliases,
  setupEventTriggers,
  setupLocationTriggers,
  setupMiscTriggers,
  setupFooter,
  setupAtakPyk,
  setupAntyflood,
  setupAtakiTriggers,
  setupCombatAliases,
  setupKillAlias,
  setupKompas,
  setupPartyShieldAliases,
  setupPrzelamAliases,
  setupWalker,
  setupZiolaAliases,
  storage,
} from './modules';
import { TEMP_TRIGGER_TAG } from '../../lib/registerTempTrigger';

// Every trigger tag registered by core-plugin modules. The client's cleanup()
// auto-removes aliases/UI/hooks on unload but NOT triggers, so destroy() must
// removeByTag each of these or reloading the plugin duplicates every trigger.
// Completeness is enforced by test/plugins/core-plugin/destroy.test.ts.
const TRIGGER_TAGS = [
  'antyflood',
  'bramy',
  'brokilon',
  'ciosyKolory',
  'colCialo',
  'colEkwipunek',
  'colEventy',
  'colMovements',
  'eventTriggers',
  'kol_druzyna',
  'mod_team',
  'mod_team:wylap',
  'glassSounds',
  'ghoule',
  'kondycje',
  'kompas',
  'miscTriggers',
  'morze',
  'pingSounds',
  'stun',
  'tmpk',
  'walkaAliasy',
  'zmeczenie',
  // Armed-on-demand one-shot triggers that may be waiting for a match:
  TEMP_TRIGGER_TAG,
  'na_statek_oneshot',
  'wsiadacz_statek',
  'wsiadacz_woz',
  'wsiadacz_statek_ned',
  'siad_oneshot',
];

let cleanupCombat: (() => void) | null = null;
let cleanupBrokilon: (() => void) | null = null;
let cleanupPalenie: (() => void) | null = null;
let cleanupAtakPyk: (() => void) | null = null;
let cleanupAntyflood: (() => void) | null = null;
let cleanupGhoule: (() => void) | null = null;
let cleanupMorze: (() => void) | null = null;
let cleanupWalker: (() => void) | null = null;
let cleanupZiola: (() => void) | null = null;
let cleanupHpBar: (() => void) | null = null;
let cleanupCharName: (() => void) | null = null;
let cleanupTorba: (() => void) | null = null;
let cleanupPlecak: (() => void) | null = null;
let cleanupLocationTriggers: (() => void) | null = null;
let cleanupDoo: (() => void) | null = null;
let cleanupAtakiTriggers: (() => void) | null = null;
let cleanupTriggerTags: (() => void) | null = null;
let cleanupTeam: (() => void) | null = null;

export async function init(api: PluginApi): Promise<PluginInfo> {
  const ORDINALS = ['', '2. ', '3. ', '4. '];
  const targets = storage.get<string[]>('targets') ?? ['INIT', 'cel2', 'cel3', 'cel4'];

  const { update: updateFooter } = setupFooter(api, targets);

  const combatState = createCombatState();
  const dobywanieState = createDobywanieState();
  const kondycjeState = createKondycjeState();
  const zmeczenieState = createZmeczenieState();

  cleanupAtakPyk = setupAtakPyk(api);
  cleanupAntyflood = setupAntyflood(api);
  cleanupGhoule = setupGhoule(api);
  cleanupAtakiTriggers = setupAtakiTriggers(api, kondycjeState);
  setupBattleAliases(api);
  setupBindAliases(api);
  setupBramy(api);
  cleanupBrokilon = setupBrokilon(api);
  setupBronieAliases(api);
  setupBuklakAliases(api);
  setupCiosyKolory(api);
  setupColCialo(api);
  setupColEkwipunek(api);
  setupColEventy(api);
  setupColMovements(api);
  setupCombatAliases(api, targets, ORDINALS, updateFooter);
  setupDebugAliases(api);
  // Weapon-drawing (dobywanie) aliases are character-specific and registered in
  // onCharName below; the kill alias only needs the shared drawn/drawCurrent state.
  setupKillAlias(api, targets, dobywanieState);
  setupKompas(api);
  setupPrzelamAliases(api);
  cleanupDoo = setupDooAliases(api);
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
  cleanupMorze = setupMorze(api);
  setupLampAliases(api);
  cleanupLocationTriggers = setupLocationTriggers(api);
  setupLocationsAliases(api);
  setupLootAliases(api);
  setupLootShitAliases(api);
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
  setupStun(api);
  setupTeamAliases(api);
  setupTeam(api); // mod_team: declensions, shield/attack banners, leadership, wylap
  setupTmpk(api);
  setupTravelAliases(api);
  cleanupWalker = setupWalker(api);
  setupWsiadaczAliases(api);
  cleanupZiola = setupZiolaAliases(api);
  setupZmeczenieTriggers(api, zmeczenieState);
  cleanupCombat = setupGmcpCombat(api, combatState, () => megaphone(api, 'ciemno'));
  cleanupTeam = () => destroyTeam(api);
  cleanupTriggerTags = () => {
    for (const tag of TRIGGER_TAGS) api.triggers.removeByTag(tag);
  };

  // Character-specific aliases — registered once the char name is known via GMCP.
  cleanupCharName = onCharName(api, (name) => {
    if (name === 'jens') {
      setupJensEmotes(api);
      setupJensDobywanie(api, dobywanieState);
      setupJensMisc(api);
      setupJensOcenaSprzetu(api);
      cleanupPalenie = setupPalenie(api);
      cleanupTorba = setupTorbaAliases(api);
    } else if (name === 'gertruda') {
      setupGertrudaEmotes(api);
      setupGertrudaDobywanie(api, dobywanieState);
      cleanupPlecak = setupPlecakAliases(api);
    }
    api.output.print(`[Core Plugin] character: ${name}`);
  });

  const info: PluginInfo = {
    name: 'Core Plugin',
    version: '0.3.1',
    author: 'vonhookin',
    description: 'Wszystko wazne, yo!',
  };
  api.output.print(`[${info.name} v${info.version}] loaded`);
  return info;
}

export async function destroy(): Promise<void> {
  cleanupCombat?.();
  cleanupCombat = null;
  cleanupBrokilon?.();
  cleanupBrokilon = null;
  cleanupPalenie?.();
  cleanupPalenie = null;
  cleanupAtakPyk?.();
  cleanupAtakPyk = null;
  cleanupAntyflood?.();
  cleanupAntyflood = null;
  cleanupGhoule?.();
  cleanupGhoule = null;
  cleanupMorze?.();
  cleanupMorze = null;
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
  cleanupLocationTriggers?.();
  cleanupLocationTriggers = null;
  cleanupDoo?.();
  cleanupDoo = null;
  cleanupAtakiTriggers?.();
  cleanupAtakiTriggers = null;
  cleanupTeam?.(); // detaches teamChange, clears the wylap capture and the bind
  cleanupTeam = null;
  cleanupTriggerTags?.();
  cleanupTriggerTags = null;
  teardownKeyboardBindings();
}
