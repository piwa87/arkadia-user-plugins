import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { rewrite } from './banner';
import { teamNominativeForms } from './team_state';

/**
 * "cel ataku" / "cel obrony" (attack & defense target) triggers. Each rewrites
 * the line into a coloured banner followed by the original message text.
 *
 * Migrated from CMUD `celataku_ja` / `celataku_ktos` / `celobrony_ja` /
 * `celobrony_ktos`. All authored the same #SUB graphical substitution; the
 * `*_ktos` variants additionally ran side effects (PYK alarm, `kogobronic`
 * var, `alias_f`) which are intentionally omitted — only the banner is kept.
 *
 * Like team_zaslony, these rebuild the line (clear + append) rather than
 * prepending to the original. The matched text is re-appended after the banner
 * with its trailing "." swapped for "!" so the web-client's own internal trigger
 * no longer matches the line and does not re-layout it.
 */


export function registerCelTriggers(api: PluginApi, tag: string): void {
  const c45 = getAnsiFormatState(45, api); // %ansi(45) — "cel ataku" banner
  const c34 = getAnsiFormatState(34, api); // %ansi(34) — "cel obrony" banner
  const def = getMyColor(0, api); // %ansi(reset) — foreground-only reset

  const atakBanner = '       cel ataku              ';
  const obronaBanner = '       cel obrony             ';

  // celataku_ja: "Wskazujesz <X> jako cel [nastepnego ]ataku." — you mark a target.
  registerTokenGate(
    api,
    'wskazujesz',
    /^Wskazujesz (.*) jako cel (?:nastepnego |)ataku\.$/,
    (line, matches) => {
      rewrite(line, [
        [atakBanner, c45],
        [` ${matches[0]}`, def],
      ]);
      return line;
    },
    tag,
  );

  // celataku_ktos: "<someone> wskazuje <X> jako cel ataku." — banner only, no PYK.
  registerTokenGate(
    api,
    'wskazuje',
    /^.*wskazuje (.*) jako cel ataku\.$/,
    (line, matches) => {
      rewrite(line, [
        [atakBanner, c45],
        [` ${matches[0]}`, def],
      ]);
      return line;
    },
    tag,
  );

  // celobrony_ja: "Wskazujesz <X> jako cel obrony." — you mark a defense target.
  registerTokenGate(
    api,
    'wskazujesz',
    /^Wskazujesz (.*) jako cel obrony\.$/,
    (line, matches) => {
      rewrite(line, [
        [obronaBanner, c34],
        [` ${matches[0]}`, def],
      ]);
      return line;
    },
    tag,
  );

  // celobrony_ktos: "<teammate-M> wskazuje <X> jako cel obrony." — the speaker
  // must be a team member (CMUD `@l_druzyna` = team nominative/M forms).
  registerTokenGate(
    api,
    'wskazuje',
    /^(.*) wskazuje (.*) jako cel obrony\.$/,
    (line, matches) => {
      const speaker = matches[1]?.trim().toLowerCase() ?? '';
      if (!teamNominativeForms().has(speaker)) return line; // not our team — pass through
      rewrite(line, [
        [obronaBanner, c34],
        [` ${matches[0]}`, def],
      ]);
      return line;
    },
    tag,
  );
}

