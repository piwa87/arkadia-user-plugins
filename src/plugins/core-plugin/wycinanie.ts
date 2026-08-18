import type { AnsiAwareBuffer, PluginApi } from '@arkadia/plugin-types';
import { registerTokenGate } from '../../lib/registerTokenGate';
import { storage } from '../../lib/storage';
import { withDelay } from '../../lib/withDelay';

const TAG = 'wycinanie';

/** true if the currently selected weapon is a sword (can cut without switching) */
function isSwordSelected(): boolean {
  // Jens: dobywanie_weapon → 'maczuga' | 'miecz' | 'topor'
  const jensWeapon = storage.get<string>('dobywanie_weapon');
  if (jensWeapon === 'miecz') return true;

  // Gertruda: gertruda_dob_loadout → 'miecze' | 'topory' | 'miecz_topor'
  const gertrudaLoadout = storage.get<string>('gertruda_dob_loadout');
  if (gertrudaLoadout === 'miecze' || gertrudaLoadout === 'miecz_topor') return true;

  return false;
}

export function setupWycinanieAliases(api: PluginApi): void {
  // wyt <n> — wytnij wszystko z 1..N ciala, one at a time via trigger
  api.aliases.register(/^wyt (\d+)$/i, (matches) => {
    const total = parseInt(matches?.[1] ?? '0', 10);
    if (total < 1) return true;

    let current = 1;
    const sword = isSwordSelected();

    // Clean up any previous in-progress sequence
    api.triggers.removeByTag(TAG);

    // Gate on cut completion lines — each match fires the next cut or finishes
    registerTokenGate(
      api,
      ['Wycinasz', 'jestes'],
      /^(?:Wycinasz .* z|Nie jestes w stanie wyciac) .*\./,
      (line: AnsiAwareBuffer) => {
        if (current >= total) {
          api.triggers.removeByTag(TAG);
          api.command.send('odloz chropowate pancerze');
          api.command.send('wlz szczatki');
          if (!sword) {
            api.command.send('opus');
            api.command.send('dob');
          }
        } else {
          current++;
          withDelay(90, 445, () => {
            api.command.send(`wytnij wszystko z ${current}. ciala`);
          });
        }
        return line;
      },
      TAG,
    );

    if (!sword) {
      api.command.send('opusc bron');
      api.command.send('dobs');
    }
    api.command.send('wytnij wszystko z 1. ciala');
    return true;
  });

  // wyt1–wyt99 → wytnij wszystko z N. ciala (single body, no trigger)
  for (let n = 1; n <= 99; n++) {
    api.aliases.register(new RegExp(`^wyt${n}$`, 'i'), () => {
      api.command.send(`wytnij wszystko z ${n}. ciala`);
      return true;
    });
  }

  // wytj - take eggs from 4 nests
  api.aliases.register(/^wytj$/, () => {
    for (let i = 1; i <= 4; i++) {
      api.command.send(`wez jaja z ${i}. gniazda`);
    }
    return true;
  });
}