import type { PluginApi, AnsiAwareBuffer, FormatStateSnapshot } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';
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

type Segment = [text: string, color: FormatStateSnapshot];

/** Replace the whole line with the given coloured segments. */
function rewrite(line: AnsiAwareBuffer, segments: Segment[]): void {
  line.clear();
  for (const [text, color] of segments) line.append(text, color);
}

export function registerCelTriggers(api: PluginApi, tag: string): void {
  const c45 = getAnsiFormatState(45, api); // %ansi(45) — "cel ataku" banner
  const c34 = getAnsiFormatState(34, api); // %ansi(34) — "cel obrony" banner
  const def = getMyColor(0, api); // %ansi(reset) — foreground-only reset

  const atakBanner = '       cel ataku              ';
  const obronaBanner = '       cel obrony             ';

  // celataku_ja: "Wskazujesz <X> jako cel [nastepnego ]ataku." — you mark a target.
  api.triggers.register(
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
  api.triggers.register(
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
  api.triggers.register(
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
  api.triggers.register(
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

/** Sample lines exercising each cel trigger (Cresa = target, Isil = teammate). */
const CELTEST_LINES = [
  'Wskazujesz Cresa jako cel ataku.',
  'Wskazujesz Cresa jako cel obrony.',
  'Isil wskazuje Cresa jako cel ataku.',
  'Isil wskazuje Cresa jako cel obrony.',
];

/**
 * `celtest` dev alias: fakes each sample line through the MUD output (via the
 * client `/fake` command) so the cel triggers can be verified live. Returns the
 * alias id for cleanup. Note: celobrony_ktos only fires if "Isil" is in the team.
 */
export function registerCelTestAlias(api: PluginApi): string {
  return api.aliases.register(/^celtest$/i, () => {
    for (const text of CELTEST_LINES) api.command.send(`/fake ${text}`);
    return true;
  });
}
