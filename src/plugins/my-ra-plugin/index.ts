import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupStones } from './modules/stones';
import { setupOrders } from './modules/orders';
import { setupCarriage } from './modules/carriage';
import { setupDining } from './modules/dining';
import { setupDetox } from './modules/detox';
import { setupMisc } from './modules/misc';
import { setupEnemies } from './modules/enemies';
import { setupKeygivers } from './modules/keygivers';
import { setupTeam } from './modules/team';
import { setupCmentarzCampo } from './modules/cmentarz-campo';
import { setupKurhanyTilea } from './modules/kurhany-tilea';
import { setupMail } from './modules/mail';
import { setupGaging } from './modules/gaging';
import { setupDropMagic } from './modules/drop-magic';
import { setupAstrolabium } from './modules/astrolabium';
import { setupSigns } from './modules/signs';
import { setupHints } from './modules/hints';
import { setupKeygiverColors } from './modules/keygiver-colors';
import { setupNpcOrders } from './modules/npc-orders';
import { setupHelp } from './modules/help';
import { setupTeamSearch } from './modules/team-search';
import { setupCombatTime } from './modules/combat-time';
import { setupLocations } from './modules/locations';
import { setupFatigue } from './modules/fatigue';
import { setupSwiatynia } from './modules/swiatynia';
import { setupCalendar } from './modules/calendar';
import { setupTraverse } from './modules/traverse';
import { setupSelling } from './modules/selling';
import { setupWindow } from './modules/window';
import { setupAdmin } from './modules/admin';

interface RaState {
  orders: Record<string, any>;
  carriageData?: any;
  enemies: any[];
  keygivers: any[];
  keygiverDrops: any[];
  keys: any[];
  api?: any;
  webhooks?: any;
  debug?: boolean;
  mail?: {
    preText?: string;
    postText?: string;
  };
  autoSwitchReleasingGuards?: boolean;
  timeouts: number[];
  money?: any;
  bankTransactionCost: number;
}

export async function init(api: PluginApi): Promise<PluginInfo> {
  const state: RaState = {
    orders: {},
    enemies: [],
    keygivers: [],
    keygiverDrops: [],
    keys: [],
    timeouts: [],
    mail: {},
    bankTransactionCost: 0,
  };

  const cleanups: Array<() => void> = [];

  // Set up all modules
  cleanups.push(setupStones(api));
  cleanups.push(setupOrders(api, state));
  cleanups.push(setupCarriage(api, state));
  cleanups.push(setupDining(api));
  cleanups.push(setupDetox(api));
  cleanups.push(setupMisc(api));
  cleanups.push(setupEnemies(api, state));
  cleanups.push(setupKeygivers(api, state));
  cleanups.push(setupTeam(api));
  cleanups.push(setupCmentarzCampo(api));
  cleanups.push(setupKurhanyTilea(api));
  cleanups.push(setupMail(api, state));
  cleanups.push(setupGaging(api));
  cleanups.push(setupDropMagic(api, state));
  cleanups.push(setupAstrolabium(api));
  cleanups.push(setupSigns(api, state));
  cleanups.push(setupHints(api));
  cleanups.push(setupKeygiverColors(api));
  cleanups.push(setupNpcOrders(api));
  cleanups.push(setupHelp(api));
  cleanups.push(setupTeamSearch(api));
  cleanups.push(setupCombatTime(api));
  cleanups.push(setupLocations(api));
  cleanups.push(setupFatigue(api));
  cleanups.push(setupSwiatynia(api));
  cleanups.push(setupCalendar(api));
  cleanups.push(setupTraverse(api));
  cleanups.push(setupSelling(api, state));
  cleanups.push(setupWindow(api, state));
  cleanups.push(setupAdmin(api, state));

  api.output.print('[My RA Plugin] Loaded');

  return {
    name: 'My RA Plugin',
    version: '0.1.0',
    author: 'Piot (Muhahaha)',
    description:
      'RA Plugin - Stones, Orders, Dining, Carriage, Detox, Misc, Enemies, Keygivers, Team, Cemetery, Kurhany, Stan, Mail, Gaging, DropMagic, Astrolabium',
  };
}
