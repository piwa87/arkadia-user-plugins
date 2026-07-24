import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';
import type { Baza } from './store';

/**
 * Port of the CMud `(?:@rkgNazwy)` → `#CW 11` trigger: highlight any noun we
 * are tracking wherever it shows up in game output, so you can spot your word
 * in a wall of text.
 *
 * One `registerToken` per noun rather than one regex alternation — token
 * triggers are word-indexed by the client and cost nothing on lines that do not
 * contain the word, whereas the alternation would be tested against every line.
 * Same approach as `tmpk.ts`.
 */

export const TAG_PODSWIETLENIE = 'rkgHighlight';

export function setupPodswietlenie(api: PluginApi, baza: Baza): () => void {
  const kolor = getAnsiFormatState(11, api);

  const odswiez = () => {
    api.triggers.removeByTag(TAG_PODSWIETLENIE);
    for (const slowo of baza.rzeczowniki) {
      if (!slowo) continue;
      api.triggers.registerToken(
        slowo,
        (line) => line.colorWords(slowo, kolor, { caseInsensitive: true }),
        TAG_PODSWIETLENIE,
        { caseInsensitive: true },
      );
    }
  };

  odswiez();
  return odswiez;
}
