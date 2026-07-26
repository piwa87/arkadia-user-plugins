import type { PluginApi } from '@arkadia/plugin-types';
import { storage } from '../../../lib/storage';
import { registerTextAlias } from '../../../lib/registerTextAlias';
import type { DobywanieState } from '../dobywanie/state';

// gertruda's weapon-drawing (dobywanie) aliases. Migrated from the CMUD
// `aliasy_dobywania` class (id 150825). Unlike jens, gertruda dual-wields:
// three loadouts — two swords (db_m), two axes (db_t), or sword + axe (db_mt).
// `dob1/dob2/dob3` pick which loadout `dob`/`db` draws.
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
// mister — has a masterwork axe that needs `przekrec stylisko` after drawing.
const MISTER = true;
// magik — a magic axe drawn via the `chdobadz` custom command.
const MAGIK: string = 'mithrylowego topora';
// Dagger scabbard for dobs/opus.
const DAGGER_SCABBARD = 'kunsztownej pochwy';

type Loadout = 'miecze' | 'topory' | 'miecz_topor';
const LOADOUT_KEY = 'gertruda_dob_loadout';

export function setupGertrudaDobywanie(api: PluginApi, state: DobywanieState): void {
  // CMUD `dob` defaulted to `db_m` (two swords); dob1/2/3 reassign it.
  let loadout: Loadout = storage.get<Loadout>(LOADOUT_KEY) ?? 'miecze';

  // db_m — draw two swords
  const drawSwords = (): void => {
    state.drawn = true;
    api.command.send(POCH_1 ? `wez miecz z ${POCH_1}` : 'wyj miecz');
    api.command.send(POCH_2 ? `wez miecz z ${POCH_2}` : 'wyj miecz');
    if (MAGIK) api.command.send(`chdobadz ${MAGIK}`);
    api.command.send('chdobadz mieczy');
  };

  // db_t — draw two axes
  const drawAxes = (): void => {
    state.drawn = true;
    api.command.send(TEMB_1 ? `wez topor z ${TEMB_1}` : 'wyj topor');
    api.command.send(TEMB_2 ? `wez topor z ${TEMB_2}` : 'wyj topor');
    if (MISTER) {
      api.command.send('dobadz misternego topora');
      api.command.send('przekrec stylisko');
    }
    if (MAGIK) api.command.send(`chdobadz ${MAGIK}`);
    api.command.send('gzdobadz toporow');
  };

  // db_mt — draw a sword and an axe
  const drawSwordAxe = (): void => {
    state.drawn = true;
    api.command.send(POCH_1 ? `wez miecz z ${POCH_1}` : 'wyj miecz');
    api.command.send(TEMB_1 ? `wez topor z ${TEMB_1}` : 'wyj topor');
    if (MISTER) {
      api.command.send('dobadz misternego topora');
      api.command.send('przekrec stylisko');
    }
    if (MAGIK) api.command.send(`chdobadz ${MAGIK}`);
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

  // db_m / db_t / db_mt — draw a specific loadout explicitly
  api.aliases.register(/^db_m$/, () => {
    drawSwords();
    return true;
  });
  api.aliases.register(/^db_t$/, () => {
    drawAxes();
    return true;
  });
  api.aliases.register(/^db_mt$/, () => {
    drawSwordAxe();
    return true;
  });

  // dob1/dob2/dob3 — pick which loadout `dob` draws (persisted). CMUD also
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
    api.command.send('sig Miecz + topor');
    loadout = 'miecz_topor';
    storage.set(LOADOUT_KEY, loadout);
    return true;
  });

  // opu — sheathe all weapons
  api.aliases.register(/^opu$/, () => {
    state.drawn = false;
    api.command.send(POCH_1 ? `wloz miecz do ${POCH_1}` : 'wlz miecz');
    api.command.send(POCH_2 ? `wloz miecz do ${POCH_2}` : 'wlz miecz');
    api.command.send(TEMB_1 ? `wloz topor do ${TEMB_1}` : 'wlz topor');
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
