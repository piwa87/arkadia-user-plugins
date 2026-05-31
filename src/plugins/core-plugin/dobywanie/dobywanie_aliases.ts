import type { PluginApi } from '@arkadia/plugin-types';
import { storage } from '../../../lib/storage';

// --- State ---

export type WeaponType = 'maczuga' | 'miecz' | 'topor';

export interface DobywanieState {
  /** true = weapon is drawn, false = put away */
  drawn: boolean;
  /** currently selected weapon (dob/db will draw this) */
  weapon: WeaponType;
  /** true = armor is worn */
  armorWorn: boolean;
}

const WEAPON_KEY = 'dobywanie_weapon';

export function createDobywanieState(): DobywanieState {
  const savedWeapon = storage.get<WeaponType>(WEAPON_KEY);
  return { drawn: false, weapon: savedWeapon ?? 'maczuga', armorWorn: true };
}

// --- Private helpers ---

function putAllAway(api: PluginApi, state: DobywanieState): void {
  state.drawn = false;
  api.command.send('wloz miecz do nitowanej pochwy');
  api.command.send('wloz dobyta bron do swojego temblaka');
  api.command.send('gzzarzuc zalozona tarcze');
  api.command.send('otu');
}

function drawMace(api: PluginApi, state: DobywanieState): void {
  state.drawn = true;
  api.command.send('wez maczuge ze swojego temblaka');
  api.command.send('dobadz maczugi');
  api.command.send('gzzdejmij');
  api.command.send('zaloz tarcze');
}

function drawSword(api: PluginApi, state: DobywanieState): void {
  state.drawn = true;
  api.command.send('wez miecz z nitowanej pochwy');
  api.command.send('dobadz miecza');
  api.command.send('zaloz tarcze');
}

function drawAxe(api: PluginApi, state: DobywanieState): void {
  state.drawn = true;
  api.command.send('wez topor ze swojego temblaka');
  api.command.send('dobadz topora');
  api.command.send('gzzdejmij');
  api.command.send('zaloz tarcze');
}

function drawCurrent(api: PluginApi, state: DobywanieState): void {
  switch (state.weapon) {
    case 'maczuga':
      drawMace(api, state);
      break;
    case 'miecz':
      drawSword(api, state);
      break;
    case 'topor':
      drawAxe(api, state);
      break;
  }
}

// --- Alias setup ---

export function setupDobywanieAliases(api: PluginApi, state: DobywanieState): void {
  // dob / db — draw currently selected weapon
  api.aliases.register(/^(?:dob|db)$/, () => {
    drawCurrent(api, state);
    return true;
  });

  // dobmc — draw mace explicitly
  api.aliases.register(/^dobmc$/, () => {
    drawMace(api, state);
    return true;
  });

  // dobm — draw sword explicitly
  api.aliases.register(/^dobm$/, () => {
    drawSword(api, state);
    return true;
  });

  // dobt — draw axe explicitly
  api.aliases.register(/^dobt$/, () => {
    drawAxe(api, state);
    return true;
  });

  // dob1/dob2/dob3 — select active weapon (persisted to localStorage)
  api.aliases.register(/^dob1$/, () => {
    state.weapon = 'maczuga';
    storage.set(WEAPON_KEY, 'maczuga');
    api.output.print('--> Macka');
    return true;
  });

  api.aliases.register(/^dob2$/, () => {
    state.weapon = 'miecz';
    storage.set(WEAPON_KEY, 'miecz');
    api.output.print('--> Miecz');
    return true;
  });

  api.aliases.register(/^dob3$/, () => {
    state.weapon = 'topor';
    storage.set(WEAPON_KEY, 'topor');
    api.output.print('--> Topor');
    return true;
  });

  // opu — sheathe all weapons, sling shield, wrap in cloak
  api.aliases.register(/^opu$/, () => {
    putAllAway(api, state);
    return true;
  });

  // dobs — draw dagger from ornate scabbard
  api.aliases.register(/^dobs$/, () => {
    api.command.send('podobadz sztyletu z wyszukanej pochwy');
    return true;
  });

  // opus — sheathe dagger into ornate scabbard
  api.aliases.register(/^opus$/, () => {
    api.command.send('powsun sztylet do wyszukanej pochwy');
    return true;
  });

  // skifb1 — sheathe everything, switch to mace, draw mace
  api.aliases.register(/^skifb1$/, () => {
    putAllAway(api, state);
    state.weapon = 'maczuga';
    storage.set(WEAPON_KEY, 'maczuga');
    api.output.print('--> Macka');
    drawMace(api, state);
    return true;
  });

  // dobny — discard broken weapons, re-draw from storage
  api.aliases.register(/^dobny$/, () => {
    api.command.send('odloz zlamane bronie');
    api.command.send('podobadz miecza z nitowanej pochwy');
    api.command.send('wyj miecz');
    api.command.send('dobadz miecza');
    api.command.send('dobadz topora');
    return true;
  });

  // skift — swap shield: take spare from bag, drop worn one into bag, wear spare
  api.aliases.register(/^skift$/, () => {
    api.command.send('ot');
    api.command.send('wyj tarcze');
    api.command.send('zdejmij tarcze');
    api.command.send('wlz ja');
    api.command.send('zaloz tarcze');
    api.command.send('zt');
    return true;
  });

  // nytarcz — drop damaged shield, equip fresh one from bag
  api.aliases.register(/^nytarcz$/, () => {
    api.command.send('odloz zniszczona tarcze');
    api.command.send('ot');
    api.command.send('wyj tarcze');
    api.command.send('zaloz tarcze');
    return true;
  });

  // zb! — toggle armor set on/off
  api.aliases.register(/^zb!$/, () => {
    if (!state.armorWorn) {
      api.command.send('wlz kapelusz');
      api.command.send('wyj wszystkie zbroje');
      api.command.send('zaloz je');
      state.armorWorn = true;
    } else {
      api.command.send('wlz wszystkie zbroje');
      api.command.send('wyj kapelusz');
      api.command.send('zaloz kapelusz');
      api.command.send('przekrzyw kapelusz nonszalancko');
      state.armorWorn = false;
    }
    return true;
  });

  // macka! — quick evaluation of a one-handed mace on the ground
  api.aliases.register(/^macka!$/, () => {
    api.command.send('we jednoreczna maczuge');
    api.command.send('ocen ja');
    api.command.send('odloz ja');
    return true;
  });

  // miecz! — quick evaluation of a one-handed sword on the ground
  api.aliases.register(/^miecz!$/, () => {
    api.command.send('we jednoreczny miecz');
    api.command.send('ocen go');
    api.command.send('odloz go');
    return true;
  });
}
