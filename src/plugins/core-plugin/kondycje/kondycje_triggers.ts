import type { PluginApi, AnsiAwareBuffer, FormatStateSnapshot } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { col0, col2, col3, col4, col5, col6, col9 } from '../../../lib/colors/my-colors';

export interface KondycjeState {
  hp: number; // 1-7 (1=barely alive, 7=excellent)
  hpinfo: boolean; // notify when HP becomes full
  hpinfoTimer: ReturnType<typeof setTimeout> | null;
  teamBadLastAlert: number; // timestamp for team alert cooldown
  hpColorStates?: ReadonlyArray<FormatStateSnapshot | undefined>;
}

export function createKondycjeState(): KondycjeState {
  return {
    hp: 4,
    hpinfo: false,
    hpinfoTimer: null,
    teamBadLastAlert: 0,
  };
}

// Ordered worst→best. Index+1 = HP level used throughout.
const HP_STATES = [
  'ledwo zyw',
  'ciezko rann',
  'w zlej kondycji',
  'rann',
  'lekko rann',
  'w dobrym stanie',
  'w swietnej kondycji',
] as const;

// Readable display labels (masculine default), keyed by HP level 1-7.
const HP_LABELS = [
  'ledwo zywy',
  'ciezko ranny',
  'w zlej kondycji',
  'ranny',
  'lekko ranny',
  'w dobrym stanie',
  'w swietnej kondycji',
] as const;

/** Human-readable condition label for an HP level (1-7). */
export function getHpLabel(level: number): string {
  return HP_LABELS[level - 1] ?? 'nieznana kondycja';
}

function initializeHPColors(api: PluginApi): ReadonlyArray<FormatStateSnapshot | undefined> {
  return [
    getAnsiFormatState(47, api), // 1 ledwo zyw       → fg15 white  + bg2 dark gray
    getAnsiFormatState(86, api), // 2 ciezko rann     → fg6  red    + bg5 dark purple
    getAnsiFormatState(6, api), // 3 w zlej kondycji → fg6  red    + bg0
    getAnsiFormatState(5, api), // 4 ranny           → fg5  amber  + bg0
    getAnsiFormatState(4, api), // 5 lekko ranny     → fg4  green  + bg0
    getAnsiFormatState(0, api), // 6 w dobrym stanie → fg0  gray   + bg0
    getAnsiFormatState(0, api), // 7 w swietnej kondycji → fg0 gray + bg0
  ];
}

// Bind labels matching lista_bindow: QQ=member1, WW=member2, …
const BIND_LABELS = [
  'QQ',
  'WW',
  'EE',
  'RR',
  'TT',
  'YY',
  'UU',
  'II',
  'OO',
  'PP',
  'AA',
  'SS',
  'DD',
  'FF',
  'GG',
  'HH',
  'JJ',
  'KK',
  'LL',
  'ZZ',
];

function getHpLevel(baseState: string): number {
  const idx = HP_STATES.indexOf(baseState as (typeof HP_STATES)[number]);
  return idx >= 0 ? idx + 1 : 4;
}

/**
 * Counts attackers from the raw attacker string using the same comma-insertion
 * trick as the original CMUD composite2list workaround.
 */
function getAttackerCount(raw: string): number {
  if (!raw.trim()) return 0;
  const forCount = raw
    .replace('go ty', 'TY')
    .replace('je ty', 'TY')
    .replace('ja ty', 'TY')
    .replace('dwaj ', 'dwaj, ')
    .replace('dwoch ', 'dwoch, ')
    .replace('dwie ', 'dwie, ')
    .replace('trzej ', 'trz, ej, ')
    .replace('trzy ', 'tr, zy, ')
    .replace('trzech ', 'trz, ech, ')
    .replace(' i ', ', '); // Polish "X, Y i Z" → split correctly
  return forCount.split(',').filter((x) => x.trim().length > 0).length;
}

// ---------------------------------------------------------------------------
// Line builders
// ---------------------------------------------------------------------------

/**
 * Builds the substitution line for a non-player character.
 *
 * Party member (isParty=true):
 *   [RED_N]->[hpColor   condition] [col3_QQ] CharName  [col3_QQ] <-|RED_N|=
 *
 * Non-party (enemy/NPC):
 *   [GREEN_N]->[hpColor   condition] [  ] CharName       <-|col3_N|=
 *
 * Count colors: %ansi(6)=red for enemies on party, %ansi(4)=green for us on enemies.
 * Bind label color: %ansi(3)=col3 (light gray).
 */
function buildOtherLine(
  api: PluginApi,
  charName: string,
  hpBase: string,
  hpSuffix: string,
  hpLevel: number,
  isParty: boolean,
  bindIdx: number,
  attackerCount: number,
  hpColors: ReadonlyArray<FormatStateSnapshot | undefined>,
): AnsiAwareBuffer {
  const buf = new api.AnsiAwareBuffer();
  const hpText = (hpBase + hpSuffix).toLowerCase();
  const hpColor = hpColors[hpLevel - 1];
  const bindLabel = isParty && bindIdx >= 0 ? BIND_LABELS[bindIdx] : null;
  const colorBase = api.colors.fromHex(col0);
  const colorBind = api.colors.fromHex(col3); // %ansi(3) — bind labels
  const colorCntLeft = api.colors.fromHex(isParty ? col6 : col4); // red (party) / green (enemy)
  const colorCntRight = api.colors.fromHex(isParty ? col6 : col4); // red (party) / green (enemy)

  // Leading indent
  const leadSpaces = attackerCount > 0 ? (attackerCount > 9 ? 4 : 5) : 10;
  buf.append(' '.repeat(leadSpaces), colorBase);

  // [N]->
  if (attackerCount > 0) {
    buf.append('[', colorBase);
    buf.append(String(attackerCount), colorCntLeft);
    buf.append(']->', colorBase);
  }

  // [   condition text   ]
  buf.append('[', colorBase);
  buf.append(' '.repeat(Math.max(0, 20 - hpText.length)) + hpText, hpColor);
  buf.append(']', colorBase);

  // [BIND] or [  ]
  buf.append(' [', colorBase);
  if (bindLabel) {
    buf.append(bindLabel, colorBind);
  } else {
    buf.append('  ', colorBase);
  }
  buf.append(']', colorBase);

  // Character name
  buf.append(' ' + charName);

  // Right-hand attacker count
  if (attackerCount > 0) {
    if (isParty) {
      buf.append(' '.repeat(Math.max(0, 35 - charName.length)));
      buf.append('[');
      buf.append(bindLabel ?? '  ', colorBind);
      buf.append('] <-|');
      buf.append(String(attackerCount), colorCntRight);
      buf.append('|', colorBase);
    } else {
      buf.append(' '.repeat(Math.max(0, 39 - charName.length)));
      buf.append(' <-|');
      buf.append(String(attackerCount), colorCntRight);
      buf.append('|', colorBase);
    }
  }

  return buf;
}

/**
 * Builds the substitution line for the player character.
 *
 * No attackers:
 *   {10}[{hpColor}   condition{reset}] [{col3}RZ{reset}] {col9}JA
 *
 * With attackers (enemies on player = red, %ansi(6)):
 *   {5}[{red}N{reset}]->[{hpColor}   condition{reset}] [{col3}RZ{reset}] {col9}JA{pad} [{col3}RZ{reset}] <-|{red}N{reset}|=
 */
function buildPlayerLine(
  api: PluginApi,
  hpBase: string,
  hpSuffix: string,
  hpLevel: number,
  attackerCount: number,
  hpColors: ReadonlyArray<FormatStateSnapshot | undefined>,
): AnsiAwareBuffer {
  const buf = new api.AnsiAwareBuffer();
  const hpText = (hpBase + hpSuffix).toLowerCase();
  const hpColor = hpColors[hpLevel - 1];
  const colorBase = api.colors.fromHex(col0);
  const colorRZ = api.colors.fromHex(col3); // %ansi(3) — bind label
  const colorJA = api.colors.fromHex(col9);
  const colorCnt = api.colors.fromHex(col6); // %ansi(6) — enemies on player = red

  if (attackerCount === 0) {
    buf.append(' '.repeat(10), colorBase);
    buf.append('[', colorBase);
    buf.append(' '.repeat(Math.max(0, 20 - hpText.length)) + hpText, hpColor);
    buf.append('] [', colorBase);
    buf.append('RZ', colorRZ);
    buf.append('] ', colorBase);
    buf.append('JA', colorJA);
  } else {
    buf.append(' '.repeat(5), colorBase);
    buf.append('[', colorBase);
    buf.append(String(attackerCount), colorCnt);
    buf.append(']->[', colorBase);
    buf.append(' '.repeat(Math.max(0, 20 - hpText.length)) + hpText, hpColor);
    buf.append('] [', colorBase);
    buf.append('RZ', colorRZ);
    buf.append('] ', colorBase);
    buf.append('JA', colorJA);
    buf.append(' '.repeat(32), colorBase);
    buf.append(' [', colorBase);
    buf.append('RZ', colorRZ);
    buf.append('] <-|', colorBase);
    buf.append(String(attackerCount), colorCnt);
    buf.append('|', colorBase);
  }

  return buf;
}

function printAlertBanner(api: PluginApi, text: string, color: string, lines = 3): void {
  const c = api.colors.fromHex(color);
  api.output.print('');
  for (let i = 0; i < lines; i++) {
    const buf = new api.AnsiAwareBuffer(text);
    buf.color([0, buf.length], c);
    api.output.print(buf);
  }
  api.output.print('');
}

function printOverwhelmAlert(api: PluginApi, name: string, count: number): void {
  const buf = new api.AnsiAwareBuffer();
  buf.append(` !!! ${name} - ${count} WROGÓW !!! `, api.colors.fromHex(col6));
  api.output.print(buf);
}

// ---------------------------------------------------------------------------
// Public setup
// ---------------------------------------------------------------------------

export function setupKondycjeTriggers(api: PluginApi, state: KondycjeState): void {
  const tag = 'kondycje';
  const hpColors = initializeHPColors(api);
  state.hpColorStates = hpColors;

  // kond_inni — condition line for any character other than the player
  api.triggers.register(
    /^(.*) jest (ledwo zyw|ciezko rann|w zlej kondycji|rann|lekko rann|w dobrym stanie|w swietnej kondycji)(|y|a|e)\.(?: Atakuj[ea] (?:[a-z]+) (.*)\.| Atakujesz (.*)\.|)$/,
    (line, matches) => {
      if (!matches) return line;

      const charName = matches[1];
      const hpBase = matches[2];
      const hpSuffix = matches[3] ?? '';
      // Group 4: someone attacks target; group 5: player attacks target ("Atakujesz go.")
      const attackerRaw = (matches[4] ?? '') + (matches[5] ?? '');

      // Skip lines produced by "wyglada" / "oceniasz" commands
      const firstWord = charName.split(' ')[0];
      if (firstWord === 'Wyglada' || firstWord === 'Oceniasz') return line;

      const cleanName = charName.replace(/[\[\]]/g, '').toLowerCase();
      const teamNames = api.team.getMembers().map((m) => m.toLowerCase());
      const isParty = teamNames.includes(cleanName);
      let teamIdx = -1;
      if (isParty) {
        const obj = api.objects
          .getObjectsOnLocation()
          .find((o) => o.__category === 'team' && o.desc?.toLowerCase() === cleanName);
        const s = obj?.shortcut?.toUpperCase();
        if (s && s >= 'A' && s <= 'Z') teamIdx = s.charCodeAt(0) - 65;
      }
      const hpLevel = getHpLevel(hpBase);
      const attackerCount = getAttackerCount(attackerRaw);

      if (isParty) {
        const now = Date.now();
        if (hpLevel <= 2 && now - state.teamBadLastAlert > 3_000) {
          state.teamBadLastAlert = now;
          api.command.send('play_lowhp');
          const row = ' . '.repeat(14) + '   D R U Z Y N A   C I E Z K O   R A N N A   ' + ' . '.repeat(14);
          printAlertBanner(api, row, col5);
        } else if (hpLevel === 3 && now - state.teamBadLastAlert > 5_000) {
          state.teamBadLastAlert = now;
          api.command.send('play_lowhp');
          const row = ' . '.repeat(13) + '   D R U Z Y N A   W   Z L E J   K O N D Y C J I   ' + ' . '.repeat(13);
          printAlertBanner(api, row, col2);
        }

        if (attackerCount > 4) {
          printOverwhelmAlert(api, charName, attackerCount);
        }
      }

      return buildOtherLine(api, charName, hpBase, hpSuffix, hpLevel, isParty, teamIdx, attackerCount, hpColors);
    },
    tag,
  );

  // kondycja_ja — player's own condition line
  api.triggers.register(
    /^Jestes (ledwo zyw|ciezko rann|w zlej kondycji|rann|lekko rann|w dobrym stanie|w swietnej kondycji)(a|y|e|)\.(?: Atakuj[ea] cie (.*)\.|)$/,
    (line, matches) => {
      if (!matches) return line;

      const hpBase = matches[1];
      const hpSuffix = matches[2] ?? '';
      const attackerRaw = matches[3] ?? '';

      const hpLevel = getHpLevel(hpBase);
      state.hp = hpLevel;

      const attackerCount = getAttackerCount(attackerRaw);

      // Full HP notification (re-arms after 90 s)
      if (hpLevel === 7 && state.hpinfo) {
        state.hpinfo = false;
        api.command.send('play_drums');
        api.events.emit('notify', { text: 'Full HP!', time: 3_000 });
        if (state.hpinfoTimer) clearTimeout(state.hpinfoTimer);
        state.hpinfoTimer = setTimeout(() => {
          state.hpinfo = true;
        }, 90_000);
      }

      if (attackerCount > 4) {
        printOverwhelmAlert(api, 'TY', attackerCount);
      }

      return buildPlayerLine(api, hpBase, hpSuffix, hpLevel, attackerCount, hpColors);
    },
    tag,
  );
}
