import type { PluginApi, AnsiAwareBuffer, FormatStateSnapshot } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';
import { requestPermission, notify } from '../../../lib/notifications';
import { teamIndexByBiernik, teamIndexByNarzednik, teamBindLabel, teamNominativeForms } from './team_state';

/**
 * Attack / panic / stun triggers (migrated from core-plugin CMUD aliases).
 *
 * Each #SUB rewrites the matched line into a highlighted "atak" banner and plays
 * a ding; the panic lines also raise a browser notification; the stun lines fire
 * the 3-line OGLUSZENIE alarm (also reachable via the `stunalarm` alias).
 *
 * The `allEnemiesKilled` HP notification (and its `ake` alias) stays in
 * core-plugin — it depends on core's kondycje state.
 */

type Segment = [text: string, color: FormatStateSnapshot];

/** Replace the whole line with the given coloured segments. */
function rewrite(line: AnsiAwareBuffer, segments: Segment[]): void {
  line.clear();
  for (const [text, color] of segments) line.append(text, color);
}

/** Lines that share the " atak " + %trigger + "CIEBIE!" banner. */
const ATAK_TRIGGER_PATTERNS = [
  /^(.*) zaciska uchwyt na swej broni i rozpoczyna z toba walke!$/, // atak_kg
  /^(.*) (?:ostroznie obchodzi cie|wykrzykujac glosno|od niechcenia, wyraznie cie lekcewazac).* (?:, atakujac cie|rzuca sie na ciebie)!$/, // atak_ks
  /^(.*) (?:wykrzykujac glosno|glosno krzyczac).*rzuca sie na ciebie!$/, // atak_mc
  /^(.*) z imieniem Morra na ustach rzuca sie do walki z toba!$/, // atak_mnie_morr
];

let enemyKilledListener: (() => void) | null = null;
let stunalarmAliasId: string | undefined;

export function setupAtaki(api: PluginApi, tag: string): void {
  requestPermission();

  const c38 = getAnsiFormatState(38, api); // %ansi(38) — "atak" label
  const c9 = getAnsiFormatState(9, api); // %ansi(9) — "CIE!/CIEBIE!"
  const c4 = getAnsiFormatState(4, api); // %ansi(4) — bind label
  const c122 = getAnsiFormatState(122, api); // %ansi(122) — panic / stun banner
  const reset = getMyColor(0, api); // %ansi(0) / %ansi(reset)

  const send = (cmd: string) => api.command.send(cmd);

  // ---- stunalarm: 3-line OGLUSZENIE banner ---------------------------------
  const STUN_LINES = [
    '                               ',
    '          OGLUSZENIE !!        ',
    '                               ',
  ];
  const printStunAlarm = () => {
    for (const text of STUN_LINES) {
      const buf = new api.AnsiAwareBuffer();
      buf.append(text, c122);
      api.output.print(buf);
    }
  };
  stunalarmAliasId = api.aliases.register(/^stunalarm$/i, () => {
    printStunAlarm();
    return true;
  });

  // ---- atakujecie: "X atakuje cie!" ----------------------------------------
  api.triggers.register(
    /^(.*) atakuje cie!$/,
    (line, m) => {
      rewrite(line, [
        ['  atak  ', c38],
        [` ${m[1]} atakuje `, reset],
        ['CIE!', c9],
      ]);
      send('play_ding');
      return line;
    },
    tag,
  );

  // ---- atakujecie_rzuca: "X rzuca sie do ataku na ciebie!" ------------------
  api.triggers.register(
    /^(.*) rzuca sie do ataku na ciebie!$/,
    (line, m) => {
      rewrite(line, [
        ['  atak  ', c38],
        [` ${m[1]} rzuca sie do ataku na `, reset],
        ['CIEBIE!', c9],
      ]);
      send('play_ding');
      send('gzataktimeroff');
      send('zi-');
      return line;
    },
    tag,
  );

  // ---- atak_kg / atak_ks / atak_mc / atak_mnie_morr: shared banner ----------
  api.triggers.register(
    ATAK_TRIGGER_PATTERNS,
    (line, m) => {
      rewrite(line, [
        [' atak ', c38],
        [` ${m[0]} `, reset],
        ['CIEBIE!', c9],
      ]);
      send('play_ding');
      return line;
    },
    tag,
  );

  // ---- panika_1os: "Wpadasz w panike!" -------------------------------------
  api.triggers.register(
    /^Wpadasz w panike!$/,
    (line, m) => {
      rewrite(line, [[`${m[0]} [UWAGA!!!  PANIKA!!!]`, c122]]);
      send('play_ding');
      notify('UWAGA PANIKA!');
      return line;
    },
    tag,
  );

  // ---- panika_ucieczka: "Udalo ci sie gdzies uciec!" -----------------------
  api.triggers.register(
    /^Udalo ci sie gdzies uciec!/,
    (line, m) => {
      rewrite(line, [
        [`${m[0]} `, reset],
        ['[UWAGA!!!  PANIKA!!!]', c122],
      ]);
      send('play_ding');
      return line;
    },
    tag,
  );

  // ---- stun_1os / stun_2: fire the OGLUSZENIE alarm, line left intact -------
  api.triggers.register(/^(.*) silnym ciosem .* oglusza cie.*/, (line) => {
    printStunAlarm();
    return line;
  }, tag);
  api.triggers.register(
    /.*siebie, ogluszajac cie jednym z takich ciosow, przed ktorym nie zdazyles sie uchylic\. Powoli osuwasz sie na ziemie\./,
    (line) => {
      printStunAlarm();
      return line;
    },
    tag,
  );

  // ---- atak_w_team: "X atakuje <teammate-B>." — enemy attacks a teammate ----
  // Banner leads with the teammate's bind label so the player can react.
  api.triggers.register(
    /^(.*) atakuje (.*)\.$/,
    (line, m) => {
      if (m[1]?.trim() === 'Nikt nie') return line; // CMUD `#IF (%1="Nikt nie") {}`
      const idx = teamIndexByBiernik(m[2] ?? '');
      if (idx < 0) return line; // target not a teammate (@druzynaB) — pass through
      rewrite(line, [
        ['  atak  ', c38],
        [' -> [', reset],
        [teamBindLabel(idx), c4],
        [`] ${m[0]}`, reset],
      ]);
      send('play_ding');
      return line;
    },
    tag,
  );

  // ---- wsparcie_w_team: "X wspiera ... w walce z <teammate-N>." -------------
  api.triggers.register(
    /^(.*) wspiera .* w walce z (.*)\.$/,
    (line, m) => {
      const idx = teamIndexByNarzednik(m[2] ?? '');
      if (idx < 0) return line; // not a teammate (@druzynaN) — pass through
      rewrite(line, [
        ['  atak  ', c38],
        [' -> [', reset],
        [teamBindLabel(idx), c4],
        [`] ${m[0]}`, reset],
      ]);
      send('play_ding');
      return line;
    },
    tag,
  );

  // ---- enemyKilled: kept wired but intentionally empty ----------------------
  // The kill follow-up (`next!` + `play_morse`) now lives on the `Zabiles
  // <target>.` text trigger below, which fires more reliably. This listener is
  // retained as a no-op placeholder in case event-driven handling is needed.
  enemyKilledListener = () => {
    // no-op
  };
  api.events.on('enemyKilled', enemyKilledListener);

  // ---- kill follow-up: `next!` + `play_morse` -------------------------------
  const killFollowUp = (line: AnsiAwareBuffer) => {
    send('next!');
    send('play_morse');
    return line;
  };

  // "Zabiles <target>." — the player kills. Case-sensitive: only a capital "Z".
  api.triggers.register(/^Zabiles (.*)\.$/, killFollowUp, tag);

  // "<teammate-M> zabil/zabila <target>." — a teammate kills. Only fires when
  // the killer is a current team member (CMUD `@druzynaM` / nominative forms).
  api.triggers.register(
    /^(.*) zabil(?:a)? (.*)\.$/,
    (line, m) => {
      const killer = m[1]?.trim().toLowerCase() ?? '';
      if (!teamNominativeForms().has(killer)) return line; // not our team — pass through
      return killFollowUp(line);
    },
    tag,
  );
}

export function destroyAtaki(api: PluginApi): void {
  if (enemyKilledListener) {
    api.events.off('enemyKilled', enemyKilledListener);
    enemyKilledListener = null;
  }
  if (stunalarmAliasId) {
    api.aliases.remove(stunalarmAliasId);
    stunalarmAliasId = undefined;
  }
  // The triggers are removed via api.triggers.removeByTag(tag).
}
