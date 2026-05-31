import type { PluginApi } from '@arkadia/plugin-types';
import { getMyColor } from '../../../lib/colors/my-colors';

const TAG = 'colEkwipunek';

export function setupColEkwipunek(api: PluginApi): void {
  const lightGray = getMyColor(3, api);
  const worn = api.colors.fromHex('#455673');

  // Item examination line
  api.triggers.register(
    /Ten element ekwipunku wyglada na .*\./,
    (line) => line.color([0, line.text.length], lightGray),
    TAG,
  );

  // Worn/equipped item lines
  api.triggers.register(
    /^(?:Przy lewym boku|Przy prawym boku|Przy prawej nodze|Przy lewej nodze|Na plecach) masz przypi\w+ .*\./,
    (line) => line.color([0, line.text.length], worn),
    TAG,
  );

  api.triggers.register(
    /^Ponad (?:twoim|jego|jej) .* ramieniem .*\./,
    (line) => line.color([0, line.text.length], worn),
    TAG,
  );

  api.triggers.register(
    /^Do pasa m(?:a|asz) przytroczone (.*)/,
    (line) => line.color([0, line.text.length], worn),
    TAG,
  );

  api.triggers.register(
    /^Trzym(?:a|asz) .* rece\.$/,
    (line) => line.color([0, line.text.length], worn),
    TAG,
  );

  api.triggers.register(
    /^M(?:a|asz) na sobie (.*)\.$/,
    (line) => line.color([0, line.text.length], worn),
    TAG,
  );

  api.triggers.register(
    /^Nos(?:i|isz) .*, .*\.$/,
    (line) => line.color([0, line.text.length], worn),
    TAG,
  );

  api.triggers.register(
    /^Trzym(?:a|asz) oburacz .*\.$/,
    (line) => line.color([0, line.text.length], worn),
    TAG,
  );

  // Equip/unequip action lines
  api.triggers.register(
    /(?:Zdejmujesz z siebie|Zakladasz|Opuszczasz|Dobywasz) .*\./,
    (line) => line.color([0, line.text.length], lightGray),
    TAG,
  );
}
