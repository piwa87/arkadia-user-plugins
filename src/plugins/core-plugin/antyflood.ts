import type { AnsiAwareBuffer, PluginApi } from '@arkadia/plugin-types';
import { getMyColor } from '../../lib/colors/my-colors';
import { registerTokenGate } from '../../lib/registerTokenGate';
import { storage } from '../../lib/storage';

/**
 * Antyflood — suppress combat lines that carry no information (ported from the
 * CMUD `antyflood` class).
 *
 * A busy team fight scrolls dozens of lines per round; the ones below say
 * nothing the player can act on, so they are dropped outright. The CMUD var was
 * a LEVEL, not a switch, and each trigger tested it with its own threshold:
 *
 *   af0  0  nothing is hidden
 *   af1  1  shield churn, blaviken hand-waving, attacks that ran into a shield,
 *           guards shouting / supporting (the default, as in CMUD)
 *   af2  2  everything from level 1 plus weapon drawing and the team's own
 *           attack lines
 *
 * The level is shared through `getAntyfloodLevel()`. The rules that need the
 * live team live with the team code and read it from here: teammates' failed
 * shield-breaks (team_lamanie.ts) and teammates' attack lines (team_ataki.ts).
 */

const TAG = 'antyflood';
const LEVEL_KEY = 'antyflood';

export type AntyfloodLevel = 0 | 1 | 2;

/** CMUD `@antyflood` — 0 off, 1 default, 2 also hides weapon-drawing. */
let level: AntyfloodLevel = 1;

/** Current suppression level; read by other modules before gagging a line. */
export function getAntyfloodLevel(): AntyfloodLevel {
  return level;
}

function loadLevel(): AntyfloodLevel {
  const stored = storage.get<unknown>(LEVEL_KEY);
  // Older builds stored a boolean here (antyflood+/antyflood-).
  if (typeof stored === 'boolean') return stored ? 1 : 0;
  if (stored === 0 || stored === 1 || stored === 2) return stored;
  return 1; // CMUD `<var name="antyflood">1</var>`
}

/** Lines hidden from level 1 up. */
const LEVEL_1 = [
  // af_zaslona — somebody stops shielding / steps out from behind a shield.
  {
    tokens: ['wychodzi', 'przestaje'],
    pattern: /^.* (?:wychodzi zza zaslony|przestaje cie zaslaniac|przestaje zaslaniac) .*/,
  },
  // af_blav1 — blaviken's endless hand-waving.
  {
    tokens: 'czyni',
    pattern: /^.* czyni dlonia ruch, jakby chciala zaslonic sie przed .*/,
  },
  // af_proba_ataku — an attack or support that ran into somebody's shield.
  {
    tokens: 'probuje',
    pattern: /^.* (?:probuje zaatakowac|probuje cie zaatakowac|probuje wesprzec).*zagradza (?:jej|mu) droge\./,
  },
  // (unnamed) — city guards shouting and supporting each other.
  {
    tokens: ['oficer', 'gwardzista', 'straznik'],
    pattern: /(?:oficer|gwardzista|straznik) (?:krzyczy|wspiera)/,
  },
];

/** Lines hidden from level 2 up. */
const LEVEL_2 = [
  // af_dobywanie — everybody drawing their weapons at the start of a fight.
  {
    tokens: 'dobywajac',
    pattern: /^.* siega do .*, dobywajac z .*\./,
  },
];

export function setupAntyflood(api: PluginApi): () => void {
  level = loadLevel();

  const info = api.colors.fromHex('#888888');
  const say = (text: string) => {
    const buf = new api.AnsiAwareBuffer();
    buf.append(text, info);
    api.output.print(buf);
  };

  // CMUD `#IF (@antyflood>=N) {#GAG}` — drop the line, or hand it back untouched.
  const gagFrom = (threshold: AntyfloodLevel) => (line: AnsiAwareBuffer) =>
    level >= threshold ? null : line;

  for (const def of LEVEL_1) {
    registerTokenGate(api, def.tokens, def.pattern, gagFrom(1), TAG);
  }
  for (const def of LEVEL_2) {
    registerTokenGate(api, def.tokens, def.pattern, gagFrom(2), TAG);
  }

  // `dobywanie` — "<X> dobywa <weapon>." is hidden at level 2; below that CMUD
  // reformatted it instead of dropping it (`#SUB {%ansi(0)%1 " d o b y w a " %2.}`).
  const reset = getMyColor(0, api);
  registerTokenGate(
    api,
    'dobywa',
    /^(.*) dobywa (.*)\./,
    (line, m) => {
      if (level >= 2) return null;
      line.clear();
      line.append(`${m[1] ?? ''}   d o b y w a   ${m[2] ?? ''}.`, reset);
      return line;
    },
    TAG,
  );

  const LEVEL_DESC: Record<AntyfloodLevel, string> = {
    0: '--> antyflood 0: nic nie jest ukrywane',
    1: '--> antyflood 1: zaslony, nieudane ataki, gwardia',
    2: '--> antyflood 2: jak 1 + dobywanie broni',
  };

  const setLevel = (next: AntyfloodLevel) => {
    level = next;
    storage.set(LEVEL_KEY, next);
    say(LEVEL_DESC[next]);
  };

  // af0 / af1 / af2 (CMUD), plus antyflood+ / antyflood- as on/off synonyms.
  const ids = [
    api.aliases.register(/^af([012])$/i, (matches) => {
      setLevel(Number(matches?.[1]) as AntyfloodLevel);
      return true;
    }),
    api.aliases.register(/^antyflood\s*([+-])$/i, (matches) => {
      setLevel(matches?.[1] === '+' ? 1 : 0);
      return true;
    }),
  ];

  return () => {
    api.triggers.removeByTag(TAG);
    for (const id of ids) api.aliases.remove(id);
  };
}
