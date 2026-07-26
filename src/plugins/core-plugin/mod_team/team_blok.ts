import type { PluginApi, FooterComponentHandle } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor, col2, col5, col6 } from '../../../lib/colors/my-colors';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { requestPermission, notify } from '../../../lib/notifications';
import { rewrite } from './banner';
import { getCurrentTeam, teamIndexByCelownik, teamNominativeForms } from './team_state';

/**
 * Blok drogi ucieczki — blocking (ported from CMUD `w_blok`).
 *
 * An enemy first announces the attempt ("X przymierza sie do odciecia ci drogi
 * ucieczki.") and the block lands about FIVE SECONDS later ("X zajmuje pozycje
 * umozliwiajaca odciecie ci drogi ucieczki.") unless the room is left first —
 * after which fleeing is impossible, which in a losing fight is fatal. Hence the
 * countdown: the whole class exists to make those five seconds impossible to
 * miss.
 *
 * The same pair of lines describes teammates being blocked, so the team's
 * celownik forms (CMUD `@druzynaC` — "odciecia *Hardinowi* drogi ucieczki") and
 * mianownik forms (`@l_druzyna`) decide which banner a line gets.
 *
 * Like team_lamanie.ts the triggers are declared as data so `bloktest!` can
 * replay sample lines through the very same handlers.
 */

type LineBuffer = Parameters<typeof rewrite>[0];
type Handler = (line: LineBuffer, matches: RegExpMatchArray) => LineBuffer | null;

interface BlokTrigger {
  /** Gate word(s) — see registerTokenGate / TRIGGERS_REFERENCE RULE #1. */
  tokens: string | string[];
  pattern: RegExp;
  handler: Handler;
}

/** Who the running countdown is about — drives the footer label and color. */
type BlokKind = 'me' | 'team' | 'mine';

const COUNTDOWN_SECONDS = 5;

const FOOTER_STYLE: Record<BlokKind, { color: string; label: string }> = {
  me: { color: col6, label: 'BLOK' }, // red — we are the ones being cut off
  team: { color: col5, label: 'BLOK' }, // orange — a teammate is
  mine: { color: col2, label: 'BLOK&gt;' }, // green — our own block is landing
};

// ---- Module state ------------------------------------------------------------

/** True while `bloktest!` replays sample lines — nothing real happens. */
let simulating = false;

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let footer: FooterComponentHandle | null = null;
let mapMoveListener: (() => void) | null = null;
let aliasIds: string[] = [];
let definitions: BlokTrigger[] = [];

// ---- Setup -------------------------------------------------------------------

export function setupBlok(api: PluginApi, tag: string): void {
  requestPermission();

  // Colors are built once here — never inside a trigger callback.
  const c67 = getAnsiFormatState(67, api); // %ansi(67) — block alarm banner
  const c79 = getAnsiFormatState(79, api); // %ansi(15,4) — "(CIEBIE!)"
  const c43 = getAnsiFormatState(43, api); // %ansi(43) — block landed / countdown frame
  const c38 = getAnsiFormatState(38, api); // %ansi(38) — warnings, "upsik", digits
  const c59 = getAnsiFormatState(59, api); // %ansi(59) — "bedzie blokowal"
  const c34 = getAnsiFormatState(34, api); // %ansi(34) — a block in our favour
  const reset = getMyColor(0, api); // %ansi(0)
  const info = api.colors.fromHex('#888888');

  const say = (text: string) => {
    const buf = new api.AnsiAwareBuffer();
    buf.append(text, info);
    api.output.print(buf);
  };

  /** Every command this module sends. Under `bloktest!` it only reports. */
  const send = (cmd: string) => {
    if (simulating) {
      say(`      [test] ${cmd}`);
      return;
    }
    api.command.send(cmd);
  };

  footer = api.ui.registerFooterComponent('blok', '', 'start');
  footer.setVisible(false);

  // ---- The 5 s countdown (CMUD `blok_alarm` + its #ALARM chain) -------------

  const renderFooter = (kind: BlokKind, left: number) => {
    const { color, label } = FOOTER_STYLE[kind];
    footer?.setContent(
      `<span style="color: ${color}; font-weight: bold; margin-left: 8px;">${label} ${left} </span>`,
    );
  };

  /** One "[ blok N sek ]" line, exactly as CMUD printed it. */
  const printTick = (left: number) => {
    const buf = new api.AnsiAwareBuffer();
    buf.append('[ blok ', c43);
    buf.append(String(left), c38);
    buf.append(' sek ]', c43);
    api.output.print(buf);
  };

  const cancelCountdown = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    footer?.setVisible(false);
  };

  const startCountdown = (kind: BlokKind) => {
    if (simulating) {
      say(`      [test] blok_alarm (${kind})`);
      return;
    }
    cancelCountdown(); // CMUD #UNTRIGGER-ed the previous alarm chain first

    let left = COUNTDOWN_SECONDS;
    printTick(left);
    renderFooter(kind, left);
    footer?.setVisible(true);

    countdownTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        cancelCountdown();
        return;
      }
      printTick(left);
      renderFooter(kind, left);
    }, 1000);
  };

  // Leaving the room IS the escape the countdown is urging — drop it silently.
  mapMoveListener = () => cancelCountdown();
  api.events.on('mapMove', mapMoveListener);

  /** `#SUB {%ansi(N)"label"%ansi(0) %trigger}` — keep the line, prefix a label. */
  const prefix = (line: LineBuffer, label: string, color: ReturnType<typeof getAnsiFormatState>) => {
    const buf = new api.AnsiAwareBuffer();
    buf.append(label, color);
    buf.append(' ', reset);
    return line.prependBuffer(buf);
  };

  // ---- The triggers --------------------------------------------------------
  definitions = [
    // blok_w_nas1: someone is setting up a block on us or on a teammate.
    {
      tokens: 'przymierza',
      pattern: /^(.*) przymierza sie do odciecia (.*) drogi ucieczki\.$/,
      handler: (line, m) => {
        const attacker = (m[1] ?? '').trim();
        const target = (m[2] ?? '').trim();

        if (target === 'ci') {
          rewrite(line, [
            ['[ UWAGA! BLOK BLOK BLOK ]', c67],
            [' ', reset],
            [attacker, reset],
            [' ', reset],
            ['(CIEBIE!)', c79],
          ]);
          send('play_alarm');
          notify('UWAGA BLOK!');
          startCountdown('me');
          return line;
        }

        // A teammate doing the blocking is handled by the next trigger — without
        // this guard a teammate blocking a teammate would also raise the alarm
        // (in CMUD both triggers fired and the later #SUB simply won).
        if (teamNominativeForms().has(attacker.toLowerCase())) return line;
        if (teamIndexByCelownik(target) < 0) return line; // nobody of ours — pass through

        rewrite(line, [
          ['[ UWAGA! BLOKUJA CI DRUZYNE ]', c67],
          [' ', reset],
          [attacker, reset],
          [' ', reset],
          [target, reset],
        ]);
        send('play_alarm');
        startCountdown('team');
        return line;
      },
    },

    // blok_team_kogos1: a teammate is setting up a block on someone.
    {
      tokens: 'przymierza',
      pattern: /^(.*) przymierza sie do odciecia (.*) drogi ucieczki\.$/,
      handler: (line, m) => {
        if (!teamNominativeForms().has((m[1] ?? '').trim().toLowerCase())) return line;
        rewrite(line, [
          ['[ .....DRUZYNA BEDZIE BLOKOWALA..... ]', c59],
          [' ', reset],
          [m[1] ?? '', reset],
          [' ', reset],
          [(m[2] ?? '').trim(), reset],
        ]);
        return line;
      },
    },

    // blok_ja_kogos1: we are setting up a block ourselves.
    {
      tokens: 'przymierzasz',
      pattern: /^Przymierzasz sie do odciecia (.*) drogi ucieczki\./,
      handler: (line, m) => {
        rewrite(line, [
          ['[ .....BEDZIESZ BLOKOWAL..... ]', c59],
          [' ', reset],
          [(m[1] ?? '').trim(), reset],
        ]);
        startCountdown('mine');
        return line;
      },
    },

    // blok_w_nas2: the block landed on us or on a teammate.
    {
      tokens: 'umozliwiajaca',
      pattern: /^(.*) zajmuje pozycje umozliwiajaca odciecie (.*) drogi ucieczki\.$/,
      handler: (line, m) => {
        const attacker = (m[1] ?? '').trim();
        const target = (m[2] ?? '').trim();

        if (target === 'ci') {
          rewrite(line, [
            ['[ ZJEBALES! Dales sie zablokowac ]', c43],
            [' ', reset],
            [attacker, reset],
            [' ', reset],
            ['(CIEBIE!)', c79],
          ]);
          cancelCountdown(); // it landed — counting down to it is pointless now
          return line;
        }

        if (teamNominativeForms().has(attacker.toLowerCase())) return line;
        if (teamIndexByCelownik(target) < 0) return line;

        rewrite(line, [
          ['[ ZJEBALES! Zablokowali ci druzyne ]', c43],
          [' ', reset],
          [attacker, reset],
          [' ', reset],
          [target, reset],
        ]);
        cancelCountdown();
        return line;
      },
    },

    // blok_team_kogos2: a teammate's block landed.
    {
      tokens: 'umozliwiajaca',
      pattern: /^(.*) zajmuje pozycje umozliwiajaca odciecie (.*) drogi ucieczki\.$/,
      handler: (line, m) => {
        if (!teamNominativeForms().has((m[1] ?? '').trim().toLowerCase())) return line;
        rewrite(line, [
          ['[ .......DRUZYNA ZABLOKOWALA........ ]', c34],
          [' ', reset],
          [m[1] ?? '', reset],
          [' ', reset],
          [(m[2] ?? '').trim(), reset],
        ]);
        return line;
      },
    },

    // blok_ja_kogos2: our own block landed.
    {
      tokens: 'zajmujesz',
      pattern: /^Zajmujesz pozycje umozliwiajaca odciecie (.*) drogi ucieczki\./,
      handler: (line, m) => {
        rewrite(line, [
          ['[ .......ZABLOKOWALES........ ]', c34],
          [' ', reset],
          [(m[1] ?? '').trim(), reset],
        ]);
        cancelCountdown();
        return line;
      },
    },

    // blok_droge_mi: we are already blocked in a direction.
    {
      tokens: 'blokuje',
      pattern: /^(.*) blokuje ci droge ucieczki na (.*)\.$/,
      handler: (line) => {
        send('play_basso');
        return prefix(line, '[ UWAGA! ktos cie przyblokowal ]', c38);
      },
    },

    // blok_droge_team: a teammate is already blocked in a direction.
    {
      tokens: 'blokuje',
      pattern: /^(.*) blokuje (.*) droge ucieczki na (.*)\.$/,
      handler: (line, m) => {
        if (teamIndexByCelownik((m[2] ?? '').trim()) < 0) return line;
        send('play_basso');
        return prefix(line, '[ UWAGA! druzyna zablokowana ]', c38);
      },
    },

    // blok_team_droge: a teammate is holding someone in place.
    {
      tokens: 'blokuje',
      pattern: /^(.*) blokuje (.*) droge na (.*)\.$/,
      handler: (line, m) => {
        if (!teamNominativeForms().has((m[1] ?? '').trim().toLowerCase())) return line;
        return prefix(line, '[ ..zablokowany, muhahaha... ]', c34);
      },
    },

    // blok_ja_droge: we are holding someone in place.
    {
      tokens: 'blokujesz',
      pattern: /^Blokujesz (.*) droge na (.*)\.$/,
      handler: (line) => prefix(line, '[ ..blokujesz droge, muhahaha... ]', c43),
    },

    // blok_ominiecie: the block was walked around.
    {
      tokens: 'omija',
      pattern: /^(.*) omija (?:nieskuteczny|twoj nieskuteczny).*\.$/,
      handler: (line) => prefix(line, '[ upsik ]', c38),
    },

    // blok_stop: we gave up on our own block.
    {
      tokens: 'przerywasz',
      pattern: /^Przerywasz przygotowania do odciecia drogi ucieczki (.*)\.$/,
      handler: (line) => {
        cancelCountdown();
        return prefix(line, '[ upsik ]', c38);
      },
    },

    // blok_stop2: the enemy we wanted to block is gone.
    {
      tokens: 'blokowac',
      pattern: /^Twoj przeciwnik, ktorego chciales blokowac zniknal\./,
      handler: (line) => {
        cancelCountdown();
        return prefix(line, '[ upsik ]', c38);
      },
    },
  ];

  for (const def of definitions) {
    registerTokenGate(api, def.tokens, def.pattern, def.handler, tag);
  }

  // ---- Aliases -------------------------------------------------------------

  // bp — zablokuj przeciwnika (CMUD alias, verbatim).
  aliasIds.push(
    api.aliases.register(/^bp$/i, () => {
      api.command.send('zablokuj przeciwnika');
      return true;
    }),
  );

  // bloktest! — replay fake block lines through the real handlers.
  aliasIds.push(
    api.aliases.register(/^bloktest!$/i, () => {
      simulate(api, say);
      return true;
    }),
  );
}

// ---- bloktest! ---------------------------------------------------------------

/**
 * One sample line per trigger, with the first team member's forms substituted so
 * the team-guarded ones actually fire (CMUD's `bloktest!` spelled out real names
 * the same way).
 */
function sampleLines(): string[] {
  const first = getCurrentTeam()[0];
  const M = first?.M ?? 'Druzynowy';
  const C = first?.C ?? 'Druzynowemu';

  return [
    'Terenes przymierza sie do odciecia ci drogi ucieczki.',
    'Terenes zajmuje pozycje umozliwiajaca odciecie ci drogi ucieczki.',
    `Vorid przymierza sie do odciecia ${C} drogi ucieczki.`,
    `Vorid zajmuje pozycje umozliwiajaca odciecie ${C} drogi ucieczki.`,
    `${M} przymierza sie do odciecia Huggusowi drogi ucieczki.`,
    `${M} zajmuje pozycje umozliwiajaca odciecie Huggusowi drogi ucieczki.`,
    'Przymierzasz sie do odciecia Huggusowi drogi ucieczki.',
    'Zajmujesz pozycje umozliwiajaca odciecie Huggusowi drogi ucieczki.',
    'Mezny wysoki gwardzista blokuje ci droge ucieczki na poludnie.',
    `Potworny umiesniony troll blokuje ${C} droge ucieczki na polnoc.`,
    `${M} blokuje Huggusowi droge na wschod.`,
    'Blokujesz Huggusowi droge na zachod.',
    'Huggus omija twoj nieskuteczny blok.',
    'Przerywasz przygotowania do odciecia drogi ucieczki Huggusowi.',
    'Twoj przeciwnik, ktorego chciales blokowac zniknal.',
  ];
}

/**
 * Run the sample lines through the registered handlers exactly as the client
 * would — every definition whose pattern matches the ORIGINAL text fires, in
 * registration order, until one suppresses the line. Commands, notifications and
 * countdowns are reported instead of executed.
 */
function simulate(api: PluginApi, say: (text: string) => void): void {
  say('--- bloktest! ---');
  if (getCurrentTeam().length === 0) {
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

export function destroyBlok(api: PluginApi): void {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (mapMoveListener) {
    api.events.off('mapMove', mapMoveListener);
    mapMoveListener = null;
  }
  footer?.remove();
  footer = null;
  for (const id of aliasIds) api.aliases.remove(id);
  aliasIds = [];
  definitions = [];
  // The triggers are removed via api.triggers.removeByTag(tag) in destroyTeam.
}
