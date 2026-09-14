import type { PluginApi } from '@arkadia/plugin-types';
import { storage } from '../../../lib/storage';
import { registerTextAlias } from '../../../lib/registerTextAlias';
import type { DobywanieState } from '../dobywanie/state';

// gertruda's weapon-drawing (dobywanie) aliases. Migrated from the CMUD
// `aliasy_dobywania` class (id 150825). Gertruda dual-wields five loadouts:
// two swords, two axes, two maces, sword + mace, or sword + axe.
// `dob1`-`dob5` pick which loadout `dob`/`db` draws.
//
// The CMUD script was variable-driven; those variables are the constants below.
// Kept as `string` (not string literals) so an empty value legitimately takes
// the `#IF (@var) {...} {else}` else-branch, mirroring the original guards.

// Sword scabbards (poch_1 / poch_2)
const POCH_1: string = 'wyszukanej pochwy';
const POCH_2: string = 'drugiej wyszukanej pochwy';
// Axe slings (temb_1 / temb_2). temb_2 is unset → its guards fall to `wyj topor`.
const TEMB_1: string = 'ogrzego temblaka';
const TEMB_2: string = '';
// Dagger scabbard for dobs/opus.
const DAGGER_SCABBARD = 'kunsztownej pochwy';

type Loadout = 'miecze' | 'topory' | 'maczugi' | 'miecz_maczuga' | 'miecz_topor';
const LOADOUT_KEY = 'gertruda_dob_loadout';
const MAGIK_KEY = 'gertruda_dob_magik';

export function setupGertrudaDobywanie(api: PluginApi, state: DobywanieState): void {
  // CMUD `dob` defaulted to `db_m` (two swords); dob1/2/3 reassign it.
  let loadout: Loadout = storage.get<Loadout>(LOADOUT_KEY) ?? 'miecze';
  let magik = storage.get<string>(MAGIK_KEY) ?? '';

  // db_m — draw two swords
  const drawSwords = (): void => {
    state.drawn = true;
    api.command.send(POCH_1 ? `wez miecz z ${POCH_1}` : 'wyj miecz');
    api.command.send(POCH_2 ? `wez miecz z ${POCH_2}` : 'wyj miecz');
    if (magik) api.command.send(`chdobadz ${magik}`);
    api.command.send('chdobadz mieczy');
  };

  // db_t — draw two axes
  const drawAxes = (): void => {
    state.drawn = true;
    api.command.send(TEMB_1 ? `wez topor z ${TEMB_1}` : 'wyj topor');
    api.command.send(TEMB_2 ? `wez topor z ${TEMB_2}` : 'wyj topor');
    if (magik) api.command.send(`chdobadz ${magik}`);
    api.command.send('gzdobadz toporow');
  };

  // db_mac — draw two maces
  const drawMaces = (): void => {
    state.drawn = true;
    api.command.send(TEMB_1 ? `wez maczuge z ${TEMB_1}` : 'wyj maczuge');
    api.command.send(TEMB_2 ? `wez maczuge z ${TEMB_2}` : 'wyj maczuge');
    if (magik) api.command.send(`chdobadz ${magik}`);
    api.command.send('dobadz maczugi');
  };

  // db_mt — draw a sword and an axe
  const drawSwordAxe = (): void => {
    state.drawn = true;
    api.command.send(POCH_1 ? `wez miecz z ${POCH_1}` : 'wyj miecz');
    api.command.send(TEMB_1 ? `wez topor z ${TEMB_1}` : 'wyj topor');
    if (magik) api.command.send(`chdobadz ${magik}`);
    api.command.send('chdobadz');
  };

  // db_mmac — draw a sword and a mace
  const drawSwordMace = (): void => {
    state.drawn = true;
    api.command.send(POCH_1 ? `wez miecz z ${POCH_1}` : 'wyj miecz');
    api.command.send(TEMB_1 ? `wez maczuge z ${TEMB_1}` : 'wyj maczuge');
    if (magik) api.command.send(`chdobadz ${magik}`);
    api.command.send('chdobadz');
  };

  const drawCurrent = (): void => {
    switch (loadout) {
      case 'miecze':
        drawSwords();
        break;
      case 'topory':
        drawAxes();
        break;
      case 'maczugi':
        drawMaces();
        break;
      case 'miecz_maczuga':
        drawSwordMace();
        break;
      case 'miecz_topor':
        drawSwordAxe();
        break;
    }
  };

  // Let the shared `c` kill aliases auto-draw the selected loadout.
  state.drawCurrent = () => drawCurrent();

  // dob / db — draw the currently selected loadout
  api.aliases.register(/^(?:dob|db)$/, () => {
    drawCurrent();
    return true;
  });

  // db_m / db_t / db_mac / db_mmac / db_mt — draw a specific loadout explicitly
  api.aliases.register(/^db_m$/, () => {
    drawSwords();
    return true;
  });
  api.aliases.register(/^db_t$/, () => {
    drawAxes();
    return true;
  });
  api.aliases.register(/^db_mac$/, () => {
    drawMaces();
    return true;
  });
  api.aliases.register(/^db_mmac$/, () => {
    drawSwordMace();
    return true;
  });
  api.aliases.register(/^db_mt$/, () => {
    drawSwordAxe();
    return true;
  });

  // dob1-dob5 — pick which loadout `dob` draws (persisted). CMUD also
  // fired a `sig` status label; kept as a raw command.
  api.aliases.register(/^dob1$/, () => {
    api.command.send('sig Miecze x2');
    loadout = 'miecze';
    storage.set(LOADOUT_KEY, loadout);
    return true;
  });
  api.aliases.register(/^dob2$/, () => {
    api.command.send('sig Topory x2');
    loadout = 'topory';
    storage.set(LOADOUT_KEY, loadout);
    return true;
  });
  api.aliases.register(/^dob3$/, () => {
    api.command.send('sig Maczugi x2');
    loadout = 'maczugi';
    storage.set(LOADOUT_KEY, loadout);
    return true;
  });
  api.aliases.register(/^dob4$/, () => {
    api.command.send('sig Miecz + maczuga');
    loadout = 'miecz_maczuga';
    storage.set(LOADOUT_KEY, loadout);
    return true;
  });
  api.aliases.register(/^dob5$/, () => {
    api.command.send('sig Miecz + topor');
    loadout = 'miecz_topor';
    storage.set(LOADOUT_KEY, loadout);
    return true;
  });

  // magik+ <slowo> — enable a magic weapon for the draw aliases.
  api.aliases.register(/^magik\+\s+(.+)$/i, (matches) => {
    const value = matches?.[1]?.trim();
    if (!value) return true;
    magik = value;
    storage.set(MAGIK_KEY, magik);
    return true;
  });

  // magik- — disable the magic weapon for the draw aliases.
  api.aliases.register(/^magik-$/i, () => {
    magik = '';
    storage.remove(MAGIK_KEY);
    return true;
  });

  // opu — sheathe weapons from the selected loadout
  api.aliases.register(/^opu$/, () => {
    state.drawn = false;
    if (loadout === 'miecze' || loadout === 'miecz_maczuga' || loadout === 'miecz_topor') {
      api.command.send(POCH_1 ? `wloz miecz do ${POCH_1}` : 'wlz miecz');
    }
    if (loadout === 'miecze') {
      api.command.send(POCH_2 ? `wloz miecz do ${POCH_2}` : 'wlz miecz');
    }
    if (loadout === 'topory' || loadout === 'miecz_topor') {
      api.command.send(TEMB_1 ? `wloz topor do ${TEMB_1}` : 'wlz topor');
    }
    if (loadout === 'maczugi' || loadout === 'miecz_maczuga') {
      api.command.send(TEMB_1 ? `wloz maczuge do ${TEMB_1}` : 'wlz maczuge');
    }
    if (loadout === 'maczugi') {
      api.command.send(TEMB_2 ? `wloz maczuge do ${TEMB_2}` : 'wlz maczuge');
    }
    // temb_2 sheathe was commented out in the CMUD source.
    api.command.send('otu');
    return true;
  });

  // dobs — draw dagger from ornate scabbard
  registerTextAlias(api, /^dobs$/, `podobadz sztyletu z ${DAGGER_SCABBARD}`);

  // opus — sheathe dagger into ornate scabbard
  registerTextAlias(api, /^opus$/, `powsun sztylet do ${DAGGER_SCABBARD}`);

  // dobny — discard broken weapons, re-draw
  api.aliases.register(/^dobny$/, () => {
    api.command.send('odloz zlamane bronie');
    api.command.send('ot');
    api.command.send('wyj topor');
    api.command.send('chdobadz');
    return true;
  });
}
