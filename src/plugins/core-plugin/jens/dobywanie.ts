import type { PluginApi } from '@arkadia/plugin-types';
import { storage } from '../../../lib/storage';
import { registerTextAlias } from '../../../lib/registerTextAlias';
import type { DobywanieState } from '../dobywanie/state';

// jens's weapon-drawing (dobywanie) aliases. Migrated from the CMUD
// `aliasy_dobywania` class. jens carries one weapon at a time (mace / sword /
// axe); `dob1/dob2/dob3` pick which one `dob` draws.

type WeaponType = 'maczuga' | 'miecz' | 'topor';

const WEAPON_KEY = 'dobywanie_weapon';

export function setupJensDobywanie(api: PluginApi, state: DobywanieState): void {
  // Character-local state (the shared DobywanieState only tracks `drawn`).
  let weapon: WeaponType = storage.get<WeaponType>(WEAPON_KEY) ?? 'maczuga';
  let armorWorn = true;

  const putAllAway = (): void => {
    state.drawn = false;
    api.command.send('wloz miecz do nitowanej pochwy');
    api.command.send('wloz dobyta bron do swojego temblaka');
    api.command.send('gzzarzuc zalozona tarcze');
    api.command.send('otu');
  };

  const drawMace = (): void => {
    state.drawn = true;
    api.command.send('wez maczuge ze swojego temblaka');
    api.command.send('dobadz maczugi');
    api.command.send('gzzdejmij');
    api.command.send('zaloz tarcze');
  };

  const drawSword = (): void => {
    state.drawn = true;
    api.command.send('wez miecz z nitowanej pochwy');
    api.command.send('dobadz miecza');
    api.command.send('zaloz tarcze');
  };

  const drawAxe = (): void => {
    state.drawn = true;
    api.command.send('wez topor ze swojego temblaka');
    api.command.send('dobadz topora');
    api.command.send('gzzdejmij');
    api.command.send('zaloz tarcze');
  };

  const drawCurrent = (): void => {
    switch (weapon) {
      case 'maczuga':
        drawMace();
        break;
      case 'miecz':
        drawSword();
        break;
      case 'topor':
        drawAxe();
        break;
    }
  };

  // Let the shared `c`/`cc` kill aliases auto-draw the selected weapon.
  state.drawCurrent = () => drawCurrent();

  // dob / db — draw currently selected weapon
  api.aliases.register(/^(?:dob|db)$/, () => {
    drawCurrent();
    return true;
  });

  // dobmc — draw mace explicitly
  api.aliases.register(/^dobmc$/, () => {
    drawMace();
    return true;
  });

  // dobm — draw sword explicitly
  api.aliases.register(/^dobm$/, () => {
    drawSword();
    return true;
  });

  // dobt — draw axe explicitly
  api.aliases.register(/^dobt$/, () => {
    drawAxe();
    return true;
  });

  // dob1/dob2/dob3 — select active weapon (persisted to localStorage)
  api.aliases.register(/^dob1$/, () => {
    weapon = 'maczuga';
    storage.set(WEAPON_KEY, 'maczuga');
    api.output.print('--> Macka');
    return true;
  });

  api.aliases.register(/^dob2$/, () => {
    weapon = 'miecz';
    storage.set(WEAPON_KEY, 'miecz');
    api.output.print('--> Miecz');
    return true;
  });

  api.aliases.register(/^dob3$/, () => {
    weapon = 'topor';
    storage.set(WEAPON_KEY, 'topor');
    api.output.print('--> Topor');
    return true;
  });

  // opu — sheathe all weapons, sling shield, wrap in cloak
  api.aliases.register(/^opu$/, () => {
    putAllAway();
    return true;
  });

  // dobs — draw dagger from ornate scabbard
  registerTextAlias(api, /^dobs$/, 'podobadz sztyletu z wyszukanej pochwy');

  // opus — sheathe dagger into ornate scabbard
  registerTextAlias(api, /^opus$/, 'powsun sztylet do wyszukanej pochwy');

  // skifb1 — sheathe everything, switch to mace, draw mace
  api.aliases.register(/^skifb1$/, () => {
    putAllAway();
    weapon = 'maczuga';
    storage.set(WEAPON_KEY, 'maczuga');
    api.output.print('--> Macka');
    drawMace();
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
    if (!armorWorn) {
      api.command.send('wlz kapelusz');
      api.command.send('wyj wszystkie zbroje');
      api.command.send('zaloz je');
      armorWorn = true;
    } else {
      api.command.send('wlz wszystkie zbroje');
      api.command.send('wyj kapelusz');
      api.command.send('zaloz kapelusz');
      api.command.send('przekrzyw kapelusz nonszalancko');
      armorWorn = false;
    }
    return true;
  });

  // macka! — quick evaluation of a one-handed mace from the room container.
  // `we` runs the room-container alias (otworz <pojemnik>; wez ... z <pojemnik>).
  api.aliases.register(/^macka!$/, () => {
    api.command.send('we jednoreczna maczuge');
    api.command.send('ocen ja');
    api.command.send('odloz ja');
    return true;
  });

  // miecz! — quick evaluation of a one-handed sword from the room container.
  api.aliases.register(/^miecz!$/, () => {
    api.command.send('we jednoreczny miecz');
    api.command.send('ocen go');
    api.command.send('odloz go');
    return true;
  });
}
