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
import { setupStan } from './modules/stan';
import { setupMail } from './modules/mail';
import { setupGaging } from './modules/gaging';
import { setupDropMagic } from './modules/drop-magic';
import { setupAstrolabium } from './modules/astrolabium';

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
  timeouts: number[];
}

export async function init(api: PluginApi): Promise<PluginInfo> {
  const state: RaState = {
    orders: {},
    enemies: [],
    keygivers: [],
    keygiverDrops: [],
    keys: [],
    timeouts: [],
    mail: {}
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
  cleanups.push(setupStan(api));
  cleanups.push(setupMail(api, state));
  cleanups.push(setupGaging(api));
  cleanups.push(setupDropMagic(api, state));
  cleanups.push(setupAstrolabium(api));

  api.output.print('[My RA Plugin] Loaded');

  return {
    name: 'My RA Plugin',
    version: '0.1.0',
    description: 'RA Plugin - Stones, Orders, Dining, Carriage, Detox, Misc, Enemies, Keygivers, Team, Cemetery, Kurhany, Stan, Mail, Gaging, DropMagic, Astrolabium',
  };
}
