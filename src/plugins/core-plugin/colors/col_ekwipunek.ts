import type { PluginApi } from '@arkadia/plugin-types';
import { getMyColor } from '../../../lib/colors/my-colors';

const TAG = 'colEkwipunek';

export function setupColEkwipunek(api: PluginApi): void {
  const lightGray = getMyColor(3, api);

  // Item examination line
  api.triggers.register(
    /Ten element ekwipunku wyglada na .*\./,
    (line) => line.color([0, line.text.length], lightGray),
    TAG,
  );

  // Equip/unequip action lines
  api.triggers.register(
    /(?:Zdejmujesz z siebie|Zakladasz|Opuszczasz|Dobywasz) .*\./,
    (line) => line.color([0, line.text.length], lightGray),
    TAG,
  );
}
