import type { PluginApi } from '@arkadia/plugin-types';
import { getMyColor } from '../../../lib/colors/my-colors';
import { registerTokenGate } from '../../../lib/registerTokenGate';

const TAG = 'colEkwipunek';

export function setupColEkwipunek(api: PluginApi): void {
  const col0 = getMyColor(0, api);
  const lightGray = getMyColor(3, api);
  const orange = getMyColor(5, api);

  // Item examination line
  registerTokenGate(
    api,
    'ekwipunku',
    /Ten element ekwipunku wyglada na .*\./,
    (line) => line.color([0, line.text.length], lightGray),
    TAG,
  );

  // Equip/unequip action lines
  registerTokenGate(
    api,
    ['zdejmujesz', 'zakladasz', 'opuszczasz', 'dobywasz'],
    /(?:Zdejmujesz z siebie|Zakladasz|Opuszczasz|Dobywasz) .*\./,
    (line) => line.color([0, line.text.length], lightGray),
    TAG,
  );

  // Putting item into container — "Wkladasz <item> do <container>."
  registerTokenGate(
    api,
    'wkladasz',
    /^Wkladasz (.*) do (.*)\.$/,
    (line, matches) => {
      if (!matches) return line;
      line.replace([0, line.text.length], '-->  ', orange);
      line.append(matches[1], lightGray);
      line.append('  |  ', lightGray);
      line.append(matches[2], col0);
      return line;
    },
    TAG,
  );
}
