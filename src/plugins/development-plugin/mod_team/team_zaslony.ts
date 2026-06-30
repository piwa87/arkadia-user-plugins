import type { PluginApi, AnsiAwareBuffer, FormatStateSnapshot } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';
import { teamGenitiveForms, teamNominativeForms, teamIndexByBiernik, LISTA_BINDOW } from './team_state';

/**
 * Zaslona (shield / dodge) triggers. Each rewrites a combat-shield line into a
 * highlighted banner. A morse cue is played only when someone is shielded FROM
 * the player or a teammate — i.e. an enemy zaslona worth trying to break.
 *
 * All banners are built the same way: clear the line, then append coloured
 * segments via `rewrite`. (CMUD authored these as #SUB or #GAG+#SAY; both reduce
 * to an in-place rewrite here — never api.output.print from a trigger callback,
 * which would queue and flush on the next output cycle.)
 */

type Segment = [text: string, color: FormatStateSnapshot];

/** Replace the whole line with the given coloured segments. */
function rewrite(line: AnsiAwareBuffer, segments: Segment[]): void {
  line.clear();
  for (const [text, color] of segments) line.append(text, color);
}

/**
 * `zas_przed_team`: "<X> zrecznie zaslania <Y> przed ciosami <Z>." where <Z> is a
 * teammate (dopelniacz) — an enemy is shielded from our team. PRZED DRUZYNA
 * banner + morse cue.
 */
function registerPrzedDruzyna(api: PluginApi, tag: string): void {
  const hi = getAnsiFormatState(38, api); // %ansi(38) — "z a s l a n i a"
  const c41 = getAnsiFormatState(41, api); // %ansi(41) — banner prefix (matches PRZED TOBA)
  const def = getAnsiFormatState(0, api); // %ansi(0) — reset

  api.triggers.register(
    /^(.*) zrecznie zaslania (.*) przed ciosami (.+)\./,
    (line, matches) => {
      const attacker = matches[3]?.trim().toLowerCase() ?? '';
      if (!teamGenitiveForms().has(attacker)) return line; // not our team — pass through

      rewrite(line, [
        ['      PRZED DRUZYNA           ', c41],
        ['     ', def],
        [matches[1], def],
        ['     ', def],
        [' z a s l a n i a ', hi],
        ['     ', def],
        [matches[2], def],
        ['     przed     ', def],
        [matches[3], def],
      ]);
      api.command.send('play_morse');
      return line;
    },
    tag,
  );
}

/**
 * `zas_team_mnie`: "<X> zrecznie zaslania cie przed ciosami <Z>." — a teammate
 * shields the player. No morse: the player is the one protected.
 */
function registerZaslaniaMnie(api: PluginApi, tag: string): void {
  const c35 = getAnsiFormatState(35, api); // %ansi(35) — banner highlight
  const c9 = getAnsiFormatState(9, api); // %ansi(9) — "CIEBIE"
  const def = getAnsiFormatState(0, api); // %ansi(0) — reset

  api.triggers.register(
    /^(.*) zrecznie zaslania cie przed ciosami (.*)\./,
    (line, matches) => {
      const shielder = matches[1]?.trim().toLowerCase() ?? '';
      if (!teamNominativeForms().has(shielder)) return line; // not our team — pass through

      rewrite(line, [
        ['  +++  ', c35],
        ['     ', def],
        [matches[1], def],
        ['     ', def],
        [' z a s l a n i a ', c35],
        ['     ', def],
        ['CIEBIE', c9],
        ['     przed     ', def],
        [matches[2], def],
      ]);
      return line;
    },
    tag,
  );
}

/**
 * `zas_team_team`: "<X> zrecznie zaslania <Y> przed ciosami <Z>." where <Y> is a
 * teammate (biernik / druzynaB) — a teammate is shielded. No morse: a teammate
 * is the one protected.
 */
function registerZaslaniaTeam(api: PluginApi, tag: string): void {
  const c35 = getAnsiFormatState(35, api); // %ansi(35) — banner highlight
  const def = getAnsiFormatState(0, api); // %ansi(0) — reset

  api.triggers.register(
    /^(.*) zrecznie zaslania (.*) przed ciosami (.*)\./,
    (line, matches) => {
      const shielded = matches[2]?.trim() ?? '';
      if (teamIndexByBiernik(shielded) < 0) return line; // shielded not our team — pass through

      rewrite(line, [
        ['  +++  ', c35],
        ['     ', def],
        [matches[1], def],
        ['     ', def],
        [' z a s l a n i a ', c35],
        ['     ', def],
        [matches[2], def],
        ['     przed     ', def],
        [matches[3], def],
      ]);
      return line;
    },
    tag,
  );
}

/**
 * `niezas_team_team`: "<X> probuje zaslonic <Y> ..., jednak nie jest w stanie
 * tego uczynic." — a teammate fails to shield teammate <Y> (biernik). Banner
 * leads with <Y>'s bind label so the player can defend them. No morse: nobody is
 * being shielded from us.
 */
function registerNieZaslania(api: PluginApi, tag: string): void {
  const hi = getAnsiFormatState(38, api); // %ansi(38) — banner highlight
  const def = getAnsiFormatState(0, api); // %ansi(0) — reset
  const bindColor = getAnsiFormatState(4, api); // %ansi(4) — bind label

  api.triggers.register(
    /^(.*) probuje zaslonic (.*) przed ciosami (.+), jednak nie jest w stanie tego uczynic\./,
    (line, matches) => {
      const shielder = matches[1]?.trim() ?? '';
      const shielded = matches[2]?.trim() ?? '';

      // Fire only for a team member failing to shield ANOTHER team member.
      if (!teamNominativeForms().has(shielder.toLowerCase())) return line;
      const idx = teamIndexByBiernik(shielded);
      if (idx < 0) return line;
      const bindLabel = LISTA_BINDOW[idx] ?? '';

      rewrite(line, [
        [' *** ', hi],
        [' [', def],
        [bindLabel, bindColor],
        [']     ', def],
        [matches[1], def],
        ['     ', def],
        [' n i e   z a s l a n i a ', hi],
        ['     ', def],
        [matches[2], def],
        ['     przed     ', def],
        [matches[3], def],
      ]);
      return line;
    },
    tag,
  );
}

/** Lines where a teammate steps in / dodges the player's own blows — morse only. */
const DODGE_PATTERNS = [
  /^(.*) z wprawa staje pomiedzy toba a (.*), przyjmujac na siebie twoje nadchodzace ciosy\./, // zasstraznik_przed_ja
  /^(.*) szybko przesuwa sie za (.*), uciekajac przed twoimi ciosami\./, // wycofka_przede_mna
  /^(.*) krotkim skinieniem dloni przyzywa (.*), kryjac sie za nia przed twoimi ciosami\./, // blav_przed_ja
  /^(.*) krotkim skinieniem dloni przyzywa .*, kryjac sie .* przed ciosami /, // blaviken_wycofka
];

/**
 * The player-centric zaslona lines (migrated from core-plugin/triggers).
 * NOTE: these reset segments use getMyColor(0), not getAnsiFormatState(0) like
 * the banners above — preserved deliberately to keep their original rendering.
 */
function registerPlayerZaslony(api: PluginApi, tag: string): void {
  const c41 = getAnsiFormatState(41, api);
  const c35 = getAnsiFormatState(35, api);
  const c38 = getAnsiFormatState(38, api);
  const c0 = getMyColor(0, api);

  // Enemy dodges/evades the player's blows — morse only, line left intact.
  api.triggers.register(
    DODGE_PATTERNS,
    (line) => {
      api.command.send('play_morse');
      return line;
    },
    tag,
  );

  // zaslona przed moimi ciosami — someone is shielded from the player. + morse.
  api.triggers.register(
    /^(.*) zrecznie zaslania (.*) przed twoimi ciosami\./,
    (line, matches) => {
      rewrite(line, [
        ['      PRZED TOBA              ', c41],
        [`     ${matches[1]}     `, c0],
        [' z a s l a n i a ', c35],
        [`     ${matches[2]}`, c0],
      ]);
      api.command.send('play_morse');
      return line;
    },
    tag,
  );

  // moja udana zaslona — the player shields someone. No morse.
  api.triggers.register(
    /^Zrecznie zaslaniasz (.*) przed ciosami (.*)\./,
    (line, matches) => {
      rewrite(line, [
        ['     z a s l a n i a s z      ', c35],
        [`     ${matches[1]}     przed     ${matches[2]}`, c0],
      ]);
      return line;
    },
    tag,
  );

  // moja nieudana zaslona — the player fails to shield someone. No morse.
  api.triggers.register(
    /^Probujesz zaslonic (.*) przed ciosami (.*), jednak nie jestes w stanie tego uczynic\./,
    (line, matches) => {
      rewrite(line, [
        ['     n i e   z a s l a n i a s z     ', c38],
        [`     ${matches[1]}     przed     ${matches[2]}`, c0],
      ]);
      return line;
    },
    tag,
  );
}

/**
 * Register every zaslona trigger. Order matters: the broad `zas_przed_team`
 * pattern also matches teammate-shielded and "cie" lines, but it pass-throughs
 * unless the attacker is a teammate, so the more specific triggers registered
 * after it win the rewrite.
 */
export function registerZaslonyTriggers(api: PluginApi, tag: string): void {
  registerPrzedDruzyna(api, tag);
  registerZaslaniaMnie(api, tag);
  registerZaslaniaTeam(api, tag);
  registerNieZaslania(api, tag);
  registerPlayerZaslony(api, tag);
}
