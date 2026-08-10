import type { AnsiAwareBuffer, PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { withDelay } from '../../../lib/withDelay';
import { getAntyfloodLevel } from '../antyflood';
import { setBind } from '../f';
import { isPykEnabled } from '../pyk';
import { spread } from './banner';
import {
  getCurrentTeam,
  isShieldedAgainstMe,
  setShieldedAgainstMe,
  teamBindLabel,
  teamIndexByBiernik,
  teamIndexByDopelniacz,
  teamNominativeForms,
} from './team_state';

/**
 * Lamanie zaslony — shield-breaking (ported from CMUD `w_lamanie`).
 *
 * The other half of the zaslona loop in team_zaslony.ts: a mob attacks the
 * player, a teammate shields them so the mob switches target, and the mob can
 * then BREAK THROUGH that shield — which throws the aggro straight back at
 * whoever was being protected. Every reaction hangs on the Polish case form in
 * the line: biernik (B) means a teammate got broken, mianownik (M) means a
 * teammate did the breaking, dopelniacz (D) for the arlekin / blaviken variants.
 *
 * Side effects, all faithful to the CMUD class:
 *   - `play_basso` on every break against us, `play_morse` on every break we win
 *   - the F-bind is armed on the broken teammate's slot key (so pressing it
 *     re-shields them), or on `rz` when the player themselves was broken
 *   - two conditional auto-attacks, both gated on `pyk+` (see AUTO_* below)
 *
 * PRESENTATION: every handler suppresses the game line (returns null) and prints
 * a `bar()` instead. Unrecognised variants pass through so the web-client's
 * built-in triggers still fire as a fallback.
 *
 * The triggers are declared as data (`definitions`) so `lamanietest!` can replay
 * sample lines through the very same handlers.
 */

type LineBuffer = AnsiAwareBuffer;
type Handler = (line: LineBuffer, matches: RegExpMatchArray) => LineBuffer | null;

/** Banner polarity: bad for us / good for us / a shield-state note. */
type Mark = '---' | '+++' | '...';

/** Width of `spread('DRUZYNA PRZELAMALA')`, the longest verb — aligns details. */
const VERB_WIDTH = 35;

interface LamanieTrigger {
  /** Gate word(s) — see registerTokenGate / TRIGGERS_REFERENCE RULE #1. */
  tokens: string | string[];
  pattern: RegExp;
  handler: Handler;
}

// ---- Module state ------------------------------------------------------------

/** False once destroyLamanie ran — guards the fire-and-forget delayed sends. */
let active = false;

/** True while `lamanietest!` replays sample lines — no real commands are sent. */
let simulating = false;

/** CMUD `@czy_pyk` — cooldown on the "teammate broke my blocker" auto-attack. */
let onCooldown = false;
let cooldownTimer: ReturnType<typeof setTimeout> | null = null;

/** CMUD `@wrog_zlamany` / `@team_zlamany` — last enemy / teammate broken. */
let wrogZlamany = '';
let teamZlamany = '';

let aliasIds: string[] = [];
let definitions: LamanieTrigger[] = [];

/** Last enemy whose shield the team broke (lowercased), '' if none. */
export function getWrogZlamany(): string {
  return wrogZlamany;
}

/** Last teammate whose shield an enemy broke (lowercased), '' if none. */
export function getTeamZlamany(): string {
  return teamZlamany;
}

/** CMUD `lamanieres!` — drop the break bookkeeping. */
function resetLamanieState(): void {
  wrogZlamany = '';
  teamZlamany = '';
  setShieldedAgainstMe(false);
  onCooldown = false;
  if (cooldownTimer) {
    clearTimeout(cooldownTimer);
    cooldownTimer = null;
  }
}

// ---- Setup -------------------------------------------------------------------

export function setupLamanie(api: PluginApi, tag: string): void {
  active = true;

  // Colors are built once here — never inside a trigger callback. They form a
  // severity ladder, so the same color never means two different things:
  const c79 = getAnsiFormatState(79, api); // white on maroon — YOU were broken
  const c38 = getAnsiFormatState(38, api); // red on grey — bad for us
  const c34 = getAnsiFormatState(34, api); // green on grey — good for us
  const c35 = getAnsiFormatState(35, api); // grey on grey — low-urgency note
  const c4 = getMyColor(4, api); // %ansi(4) — bind label
  const reset = getMyColor(0, api); // %ansi(0)
  const info = api.colors.fromHex('#888888');

  const say = (text: string) => {
    const buf = new api.AnsiAwareBuffer();
    buf.append(text, info);
    api.output.print(buf);
  };

  /** Every command this module sends. Under `lamanietest!` it only reports. */
  const send = (cmd: string) => {
    if (simulating) {
      say(`      [test] ${cmd}`);
      return;
    }
    api.command.send(cmd);
  };

  /** Same idea for the F-bind — a test run must not steal the real bind. */
  const bind = (cmd: string) => {
    if (simulating) {
      say(`      [test] f+ ${cmd}`);
      return;
    }
    setBind(api, cmd);
  };

  /**
   * The one banner shape every event in this module uses:
   *
   *     {mark}  {L E T T E R S P A C E D   V E R B}  {mark}   {detail}  [bind]
   *
   * `mark` is the polarity — `---` bad, `+++` good, `...` a shield-state note.
   * The verb field is padded to VERB_WIDTH so the detail column lines up across
   * every event. The game line is suppressed (the handler returns null) so only
   * the bar is visible; output from a trigger callback is batched with the rest
   * of the cycle, so the bar lands right where the game line would have been.
   */
  const bar = (
    mark: Mark,
    verb: string,
    detail: string,
    color: ReturnType<typeof getAnsiFormatState>,
    bindLabel = '',
  ) => {
    const buf = new api.AnsiAwareBuffer();
    buf.append(`  ${mark}  ${spread(verb).padEnd(VERB_WIDTH)}  ${mark}   ${detail}`, color);
    if (bindLabel) {
      buf.append('  [', reset);
      buf.append(bindLabel, c4);
      buf.append(']', reset);
    }
    api.output.print(buf);
  };

  /**
   * Shared "an enemy broke through a teammate's shield" reaction: alarm bar
   * carrying the victim's bind label, basso, and the F-bind armed on that team
   * slot so one key press re-shields them.
   */
  const teamBroken = (attacker: string, victim: string, idx: number, verb: string) => {
    teamZlamany = victim.toLowerCase();
    const bindLabel = teamBindLabel(idx);

    bar('---', verb, `${attacker.trim()} -> ${victim}`, c38, bindLabel);
    send('play_basso');
    if (bindLabel) bind(bindLabel); // CMUD `alias_f=%item(@lista_bindow, ...)`
    return null;
  };

  /** Shared "an enemy broke through MY shield" reaction — the worst of the set. */
  const meBroken = (attacker: string) => {
    bar('---', 'PRZELAMALI CIE', attacker.trim(), c79);
    send('play_basso');
    bind('rz'); // CMUD `f+ rz` — order the team to shield us again
    return null;
  };

  /**
   * Team slot of a member named in an oblique case. CMUD matched some of these
   * lines against @druzynaB and others against @druzynaD; for most names the two
   * forms are identical, so both are tried before giving up.
   */
  const teamSlot = (form: string): number => {
    const name = form.trim();
    const byB = teamIndexByBiernik(name);
    return byB >= 0 ? byB : teamIndexByDopelniacz(name);
  };

  // ---- The triggers, in CMUD priority order --------------------------------
  definitions = [
    // lamanie_celoslaniany: our target is behind someone else.
    {
      tokens: 'zagradza',
      pattern: /^Atakujesz (.*), lecz (.*) zagradza ci droge\./,
      handler: (_line, m) => {
        setShieldedAgainstMe(true);
        bar('...', 'cel zasloniety', `${(m[2] ?? '').trim()} -> ${(m[1] ?? '').trim()}`, c35);
        return null;
      },
    },

    // lamanie_mi_team: enemy breaks a teammate's shield.
    {
      tokens: 'przebijajac',
      pattern: /^(.*) rzuca sie na (.*) przebijajac sie przez (?:jego|jej) ochrone\./,
      handler: (line, m) => {
        const idx = teamSlot(m[2] ?? '');
        if (idx < 0) return line; // victim not on the team — pass through
        return teamBroken(m[1] ?? '', (m[2] ?? '').trim(), idx, 'PRZELAMUJA DRUZYNE');
      },
    },

    // lamanie_mnie: enemy breaks the player's own shield.
    {
      tokens: 'przebijajac',
      pattern: /^(.*) rzuca sie na ciebie przebijajac sie przez twoja ochrone\./,
      handler: (_line, m) => meBroken(m[1] ?? ''),
    },

    // lamanie_udane_team: a teammate breaks an enemy's shield.
    {
      tokens: 'przebijajac',
      pattern: /^(.*) rzuca sie na (.*) przebijajac sie przez.*ochrone\./,
      handler: (line, m) => {
        const attacker = (m[1] ?? '').trim().toLowerCase();
        if (!teamNominativeForms().has(attacker)) return line; // not our team
        const target = (m[2] ?? '').trim();
        wrogZlamany = target.toLowerCase();

        bar('+++', 'DRUZYNA PRZELAMALA', `${(m[1] ?? '').trim()} -> ${target}`, c34);
        send('play_morse');
        bind(`c ${target}`); // one key press to swing at the now-open enemy

        // AUTO-ATTACK A: the broken enemy was the one shielding against us, so
        // it is hittable again — CMUD `#IF (@czy_pyk=1 AND @zaslona_przed_ja=1)`.
        // `czy_pyk` is now the real `pyk+` switch, so nothing swings on its own
        // unless automatic attacking is turned on.
        if (isPykEnabled() && isShieldedAgainstMe() && !onCooldown) {
          onCooldown = true;
          setShieldedAgainstMe(false);
          wrogZlamany = '';
          withDelay(249, 699, () => {
            if (active) send('c');
          });
          cooldownTimer = setTimeout(() => {
            onCooldown = false;
            cooldownTimer = null;
          }, 3000); // CMUD `#ALARM pyk +3`
        }
        return null;
      },
    },

    // lamanie_zonk_ja: the player fails to break a shield. (CMUD also ran
    // `kol_manewr` here — that helper has no counterpart in this repo.)
    {
      tokens: 'przebic',
      pattern: /^Bezskutecznie rzucasz sie na (.*), probujac przebic sie przez .* ochrone\./,
      handler: (_line, m) => {
        bar('---', 'nie przelamales', (m[1] ?? '').trim(), c38);
        return null;
      },
    },

    // lamanie_udane_ja: the player breaks a shield.
    {
      tokens: 'przebijajac',
      pattern: /^Rzucasz sie na (.*) przebijajac sie przez .* ochrone\./,
      handler: (_line, m) => {
        bar('+++', 'przelamales', (m[1] ?? '').trim(), c34);
        send('play_morse');

        // AUTO-ATTACK B: back on the team's target now that the shield is gone.
        // CMUD guarded this with `@po_przelamaniu`, a var it set to 0 on first
        // use and never restored — treated here as leftover state, so the guard
        // is "pyk is on and we are in a team".
        if (isPykEnabled() && getCurrentTeam().length > 0) {
          withDelay(50, 211, () => {
            if (active) send('c cel ataku');
          });
        }
        return null;
      },
    },

    // lamanie_nieudane_team: teammate fails to break (antyflood).
    {
      tokens: 'przebic',
      pattern: /^(.*) rzuca sie na (.*), bezskutecznie probujac przebic sie przez (?:jego|jej) ochrone\./,
      handler: (line, m) => {
        const attacker = (m[1] ?? '').trim().toLowerCase();
        if (!teamNominativeForms().has(attacker)) return line; // not our team
        return getAntyfloodLevel() >= 1 ? null : line; // af0 keeps them visible
      },
    },

    // lamanie_arlekin: dancer walks through a teammate's guard.
    {
      tokens: 'tanecznym',
      pattern: /^(.*) tanecznym krokiem z latwoscia mija obrone (.*)\./,
      handler: (line, m) => {
        // CMUD matched @druzynaD here but looked the bind label up in @druzynaB,
        // so the label always came out empty — teamSlot tries both forms.
        const idx = teamSlot(m[2] ?? '');
        if (idx < 0) return line;
        return teamBroken(m[1] ?? '', (m[2] ?? '').trim(), idx, 'ARLEKIN OMIJA');
      },
    },

    // lamanie_blaviken: blaviken drifts through a teammate's guard.
    {
      tokens: 'przekreca',
      pattern:
        /^(.*) przekreca sie w strone (.*), wbijajac w.*swe niewidzace spojrzenie\. Po chwili, bez cienia zawahania zaczyna dryfowac w.*kierunku, na wskros przenikajac .*\./,
      handler: (line, m) => {
        const idx = teamSlot(m[2] ?? '');
        if (idx < 0) return line;
        return teamBroken(m[1] ?? '', (m[2] ?? '').trim(), idx, 'PRZELAMUJA DRUZYNE');
      },
    },

    // lamanie_mnie_zzaskoku: broken through by surprise.
    {
      tokens: 'przebija',
      pattern: /^(.*) wykorzystujac zaskoczenie przebija sie przez twoja ochrone\./,
      handler: (_line, m) => meBroken(m[1] ?? ''),
    },

    // lamanie_mi_team_zaskok: teammate broken through by surprise.
    {
      tokens: 'przebija',
      pattern: /^(.*) wykorzystujac zaskoczenie przebija sie przez ochrone (.*)\./,
      handler: (line, m) => {
        const idx = teamSlot(m[2] ?? '');
        if (idx < 0) return line;
        return teamBroken(m[1] ?? '', (m[2] ?? '').trim(), idx, 'PRZELAMUJA DRUZYNE');
      },
    },

    // lamanie_czysty: nobody is shielding the target anymore.
    {
      tokens: 'zaslania',
      pattern: /^Nikt nie zaslania (.*)\./,
      handler: (_line, m) => {
        setShieldedAgainstMe(false);
        bar('...', 'czysty', (m[1] ?? '').trim(), c35);
        return null;
      },
    },
  ];

  for (const def of definitions) {
    registerTokenGate(api, def.tokens, def.pattern, def.handler, tag);
  }

  // ---- Aliases -------------------------------------------------------------

  // The antyflood level itself is owned by core-plugin/antyflood.ts (af0/af1/af2).

  // lamanieres! — clear the break bookkeeping (CMUD `lamanieres!`).
  aliasIds.push(
    api.aliases.register(/^lamanieres!$/i, () => {
      resetLamanieState();
      say('--> lamanie: reset');
      return true;
    }),
  );

  // lamanietest! — replay fake break lines through the real handlers.
  aliasIds.push(
    api.aliases.register(/^lamanietest!$/i, () => {
      simulate(api, say);
      return true;
    }),
  );
}

// ---- lamanietest! ------------------------------------------------------------

/**
 * Sample lines covering every trigger, with the first team member's forms
 * substituted so the team-guarded ones actually fire (CMUD used
 * `%item(@l_druzyna,1)` / `%item(@druzynaB,1)` the same way).
 */
function sampleLines(): string[] {
  const first = getCurrentTeam()[0];
  const M = first?.M ?? 'Druzynowy';
  const B = first?.B ?? 'Druzynowego';
  const D = first?.D ?? 'Druzynowego';

  return [
    'Atakujesz glupiego trolla, lecz goblin zagradza ci droge.',
    'Nikt nie zaslania glupiego trolla.',
    `Glupi troll rzuca sie na ${B} przebijajac sie przez jego ochrone.`,
    `Glupi troll wykorzystujac zaskoczenie przebija sie przez ochrone ${B}.`,
    'Glupi troll rzuca sie na ciebie przebijajac sie przez twoja ochrone.',
    'Glupi troll wykorzystujac zaskoczenie przebija sie przez twoja ochrone.',
    `${M} rzuca sie na zielonego glupiego trolla przebijajac sie przez jego ochrone.`,
    `${M} rzuca sie na zielonego glupiego trolla, bezskutecznie probujac przebic sie przez jego ochrone.`,
    'Rzucasz sie na glupiego trolla przebijajac sie przez jego ochrone.',
    'Bezskutecznie rzucasz sie na glupiego trolla, probujac przebic sie przez jego ochrone.',
    `Arlekin tanecznym krokiem z latwoscia mija obrone ${D}.`,
    `Blaviken przekreca sie w strone ${D}, wbijajac w niego swe niewidzace spojrzenie. ` +
      'Po chwili, bez cienia zawahania zaczyna dryfowac w jego kierunku, na wskros przenikajac ciernisty zywoplot.',
  ];
}

/**
 * Run the sample lines through the registered handlers exactly as the client
 * would — every definition whose pattern matches the ORIGINAL text fires, in
 * registration order, until one suppresses the line. Commands and bind changes
 * are reported instead of executed.
 */
function simulate(api: PluginApi, say: (text: string) => void): void {
  const team = getCurrentTeam();
  say(`--- lamanietest! (pyk: ${isPykEnabled() ? 'on' : 'off'}) ---`);
  if (team.length === 0) {
    say('    druzyna pusta — linie druzynowe przeleca bez reakcji');
  }

  simulating = true;
  try {
    for (const text of sampleLines()) {
      const line = new api.AnsiAwareBuffer(text);
      let suppressed = false;

      for (const def of definitions) {
        const matches = text.match(def.pattern);
        if (!matches) continue;
        if (def.handler(line, matches) === null) {
          suppressed = true;
          break;
        }
      }

      if (suppressed) say(`      [gag] ${text}`);
      else api.output.print(line);
    }
  } finally {
    simulating = false;
  }
  say('--- koniec ---');
}

export function destroyLamanie(api: PluginApi): void {
  active = false;
  resetLamanieState();
  for (const id of aliasIds) api.aliases.remove(id);
  aliasIds = [];
  definitions = [];
  // The triggers are removed via api.triggers.removeByTag(tag) in destroyTeam.
}
