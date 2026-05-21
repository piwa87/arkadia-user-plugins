import type { PluginApi, AnsiAwareBuffer, FormatStateSnapshot } from '@arkadia/plugin-types';

export interface KondycjeState {
  hp: number;                      // 1-7 (1=barely alive, 7=excellent)
  hpinfo: boolean;                 // notify when HP becomes full
  hpinfoTimer: ReturnType<typeof setTimeout> | null;
  playerBadCondEnabled: boolean;   // ja_alert_zla: alert when player in w zlej kondycji
  playerLedwoEnabled: boolean;     // ja_alert_ledwo: auto-help when barely alive
  playerBadLastAlert: number;      // timestamp for 30s cooldown
  teamBadLastAlert: number;        // timestamp for team alert cooldown
}

export function createKondycjeState(): KondycjeState {
  return {
    hp: 4,
    hpinfo: false,
    hpinfoTimer: null,
    playerBadCondEnabled: true,
    playerLedwoEnabled: false,
    playerBadLastAlert: 0,
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

// HP colors from col_kon: [47, "6,5", 6, 5, 4, 0, 0]  (index 0 = level 1 = worst)
// Values are col_kon entries mapped to colors.ts: c7=#ff0000, c6=#bd7304, c5=#00aa04, c4=#a6a6a6
// "6,5" means c6 foreground on c5 background; 47 is interpreted as color index 7 → c7; 0 = default.
const HP_COLOR_STATES: ReadonlyArray<FormatStateSnapshot | undefined> = [
  { foreground: { space: 'hex', color: '#ff0000' } },                                           // 1 ledwo zyw       → c7 red
  { foreground: { space: 'hex', color: '#bd7304' }, background: { space: 'hex', color: '#00aa04' } }, // 2 ciezko rann     → c6 on c5
  { foreground: { space: 'hex', color: '#bd7304' } },                                           // 3 w zlej kondycji → c6
  { foreground: { space: 'hex', color: '#00aa04' } },                                           // 4 rann            → c5
  { foreground: { space: 'hex', color: '#a6a6a6' } },                                           // 5 lekko rann      → c4
  undefined,                                                                                     // 6 w dobrym stanie → default
  undefined,                                                                                     // 7 w swietnej kondycji → default
];

// CMUD ansi() color approximations used in the original script
const COL_PARTY_BIND  = '#00b300'; // ansi(3) green  – party member bind label / player RZ
const COL_PARTY_CNT   = '#bd7304'; // ansi(6) amber  – attacker count when party is the target
const COL_ENEMY_CNT   = '#a6a6a6'; // ansi(4) lgray  – attacker count when enemy is the target
const COL_NON_CNT     = '#00b300'; // ansi(3) green  – count inside <-|N|= for non-party line
const COL_ATK_NAMES   = '#808080'; // ansi(9) mgray  – attacker names on non-party line
const COL_PLAYER_JA   = '#808080'; // ansi(9) mgray  – "JA" label
const COL_ALERT_AMBER = '#bd7304'; // alert banner for heavily wounded team
const COL_ALERT_GREEN = '#00b300'; // alert banner for bad-condition team / player

// Bind labels matching lista_bindow: QQ=member1, WW=member2, …
const BIND_LABELS = [
  'QQ','WW','EE','RR','TT','YY','UU','II','OO','PP',
  'AA','SS','DD','FF','GG','HH','JJ','KK','LL','ZZ',
];

function getHpLevel(baseState: string): number {
  const idx = HP_STATES.indexOf(baseState as typeof HP_STATES[number]);
  return idx >= 0 ? idx + 1 : 4;
}

/**
 * Translates a raw Polish attacker string into a display label and attacker count.
 *
 * The count uses the same comma-insertion trick as the original CMUD composite2list
 * workaround (dwaj→2, trzej/trzy/trzech→3, otherwise 1 item per comma-token).
 */
function getAttackerInfo(raw: string): { display: string; count: number } {
  if (!raw.trim()) return { display: '', count: 0 };

  // Normalize player references for display
  let display = raw
    .replace('go ty', 'TY')
    .replace('je ty', 'TY')
    .replace('ja ty', 'TY');
  if (display.trim() === 'go') display = 'TY';

  // Count using comma-insertion trick from the original script
  const forCount = raw
    .replace('go ty', 'TY')
    .replace('je ty', 'TY')
    .replace('ja ty', 'TY')
    .replace('dwaj ',  'dwaj, ')
    .replace('dwoch ', 'dwoch, ')
    .replace('dwie ',  'dwie, ')
    .replace('trzej ', 'trz, ej, ')
    .replace('trzy ',  'tr, zy, ')
    .replace('trzech ', 'trz, ech, ');

  const count = forCount.split(',').filter(x => x.trim().length > 0).length;
  return { display, count };
}

// ---------------------------------------------------------------------------
// Line builders
// ---------------------------------------------------------------------------

/**
 * Builds the substitution line for a non-player character.
 *
 * Party member (isParty=true):
 *   {5}[{amber}N{reset}]->[{hpColor}   condition{reset}] [{green}QQ{reset}] CharName  [{green}QQ{reset}] <-|{amber}N{reset}|= attackers
 *
 * Non-party:
 *   {5}[{gray}N{reset}]->[{hpColor}   condition{reset}] [  ] CharName                 <-|{green}N{reset}|= {gray}attackers
 */
function buildOtherLine(
  api: PluginApi,
  charName: string,
  hpBase: string,
  hpSuffix: string,
  hpLevel: number,
  isParty: boolean,
  bindIdx: number,
  attackerDisplay: string,
  attackerCount: number,
): AnsiAwareBuffer {
  const buf = new api.AnsiAwareBuffer();
  const hpText    = (hpBase + hpSuffix).toLowerCase();
  const hpColor   = HP_COLOR_STATES[hpLevel - 1];
  const bindLabel = isParty && bindIdx >= 0 ? BIND_LABELS[bindIdx] : null;

  // Leading indent: 4 spaces if >9 attackers, 5 if any attackers, 10 if none
  const leadSpaces = attackerCount > 0 ? (attackerCount > 9 ? 4 : 5) : 10;
  buf.append(' '.repeat(leadSpaces));

  // [N]->
  if (attackerCount > 0) {
    buf.append('[');
    buf.append(String(attackerCount), api.colors.fromHex(isParty ? COL_PARTY_CNT : COL_ENEMY_CNT));
    buf.append(']->');
  }

  // [   condition text   ]  — right-aligned inside 20-char field
  buf.append('[');
  buf.append(' '.repeat(Math.max(0, 20 - hpText.length)) + hpText, hpColor);
  buf.append(']');

  // [BIND] or [  ]
  buf.append(' [');
  if (bindLabel) {
    buf.append(bindLabel, api.colors.fromHex(COL_PARTY_BIND));
  } else {
    buf.append('  ');
  }
  buf.append(']');

  // Character name
  buf.append(' ' + charName);

  // Right-hand attacker info
  if (attackerCount > 0) {
    if (isParty) {
      buf.append(' '.repeat(Math.max(0, 35 - charName.length)));
      buf.append('[');
      buf.append(bindLabel ?? '  ', api.colors.fromHex(COL_PARTY_BIND));
      buf.append('] <-|');
      buf.append(String(attackerCount), api.colors.fromHex(COL_PARTY_CNT));
      buf.append('|= ');
      buf.append(attackerDisplay);
    } else {
      buf.append(' '.repeat(Math.max(0, 39 - charName.length)));
      buf.append(' <-|');
      buf.append(String(attackerCount), api.colors.fromHex(COL_NON_CNT));
      buf.append('|= ');
      buf.append(attackerDisplay, api.colors.fromHex(COL_ATK_NAMES));
    }
  }

  return buf;
}

/**
 * Builds the substitution line for the player character.
 *
 * No attackers:
 *   {10}[{hpColor}   condition{reset}] [{green}RZ{reset}] {gray}JA
 *
 * With attackers:
 *   {5}[{amber}N{reset}]->[{hpColor}   condition{reset}] [{green}RZ{reset}] {gray}JA{pad} [{green}RZ{reset}] <-|{amber}N{reset}|- attackers
 */
function buildPlayerLine(
  api: PluginApi,
  hpBase: string,
  hpSuffix: string,
  hpLevel: number,
  attackerDisplay: string,
  attackerCount: number,
): AnsiAwareBuffer {
  const buf = new api.AnsiAwareBuffer();
  const hpText     = (hpBase + hpSuffix).toLowerCase();
  const hpColor    = HP_COLOR_STATES[hpLevel - 1];
  const colorGreen = api.colors.fromHex(COL_PARTY_BIND);
  const colorAmber = api.colors.fromHex(COL_PARTY_CNT);
  const colorGray  = api.colors.fromHex(COL_PLAYER_JA);

  if (attackerCount === 0) {
    buf.append(' '.repeat(10));
    buf.append('[');
    buf.append(' '.repeat(Math.max(0, 20 - hpText.length)) + hpText, hpColor);
    buf.append('] [');
    buf.append('RZ', colorGreen);
    buf.append('] ');
    buf.append('JA', colorGray);
  } else {
    buf.append(' '.repeat(5));
    buf.append('[');
    buf.append(String(attackerCount), colorAmber);
    buf.append(']->[');
    buf.append(' '.repeat(Math.max(0, 20 - hpText.length)) + hpText, hpColor);
    buf.append('] [');
    buf.append('RZ', colorGreen);
    buf.append('] ');
    buf.append('JA', colorGray);
    // 34 - len("TY") = 32 spaces to align the right side
    buf.append(' '.repeat(32));
    buf.append(' [');
    buf.append('RZ', colorGreen);
    buf.append('] <-|');
    buf.append(String(attackerCount), colorAmber);
    buf.append('|- ');
    buf.append(attackerDisplay);
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

// ---------------------------------------------------------------------------
// Public setup
// ---------------------------------------------------------------------------

export function setupKondycjeTriggers(api: PluginApi, state: KondycjeState): void {
  const tag = 'kondycje';

  // kond_inni — condition line for any character other than the player
  api.triggers.register(
    /^(.*) jest (ledwo zyw|ciezko rann|w zlej kondycji|rann|lekko rann|w dobrym stanie|w swietnej kondycji)(|y|a|e)\.(?: Atakuj[ea] (?:[a-z]+) (.*)\.| Atakujesz (.*)\.|)$/,
    (line, matches) => {
      if (!matches) return line;

      const charName    = matches[1];
      const hpBase      = matches[2];
      const hpSuffix    = matches[3] ?? '';
      // Group 4: someone attacks target; group 5: player attacks target ("Atakujesz go.")
      const attackerRaw = (matches[4] ?? '') + (matches[5] ?? '');

      // Skip lines produced by "wyglada" / "oceniasz" commands
      const firstWord = charName.split(' ')[0];
      if (firstWord === 'Wyglada' || firstWord === 'Oceniasz') return line;

      const cleanName  = charName.replace(/[\[\]]/g, '').toLowerCase();
      const teamNames  = api.team.getMembers().map(m => m.toLowerCase());
      const teamIdx    = teamNames.indexOf(cleanName);
      const isParty    = teamIdx >= 0;
      const hpLevel    = getHpLevel(hpBase);
      const { display: attackerDisplay, count: attackerCount } = getAttackerInfo(attackerRaw);

      // Team HP alerts embedded here (original: separate trigger, same priority)
      if (isParty) {
        const now = Date.now();
        if (hpLevel <= 2 && now - state.teamBadLastAlert > 3_000) {
          state.teamBadLastAlert = now;
          api.command.send('play_lowhp');
          const row = ' . '.repeat(14) + '   D R U Z Y N A   C I E Z K O   R A N N A   ' + ' . '.repeat(14);
          printAlertBanner(api, row, COL_ALERT_AMBER);
        } else if (hpLevel === 3 && now - state.teamBadLastAlert > 5_000) {
          state.teamBadLastAlert = now;
          api.command.send('play_lowhp');
          const row = ' . '.repeat(13) + '   D R U Z Y N A   W   Z L E J   K O N D Y C J I   ' + ' . '.repeat(13);
          printAlertBanner(api, row, COL_ALERT_GREEN);
        }
      }

      return buildOtherLine(
        api, charName, hpBase, hpSuffix, hpLevel,
        isParty, teamIdx, attackerDisplay, attackerCount,
      );
    },
    tag,
  );

  // kondycja_ja — player's own condition line
  api.triggers.register(
    /^Jestes (ledwo zyw|ciezko rann|w zlej kondycji|rann|lekko rann|w dobrym stanie|w swietnej kondycji)(a|y|e|)\.(?: Atakuj[ea] cie (.*)\.|)$/,
    (line, matches) => {
      if (!matches) return line;

      const hpBase      = matches[1];
      const hpSuffix    = matches[2] ?? '';
      const attackerRaw = matches[3] ?? '';

      const hpLevel = getHpLevel(hpBase);
      state.hp = hpLevel;

      const { display: attackerDisplay, count: attackerCount } = getAttackerInfo(attackerRaw);

      // Full HP notification (re-arms after 90 s)
      if (hpLevel === 7 && state.hpinfo) {
        state.hpinfo = false;
        api.command.send('play_drums');
        api.events.emit('notify', { text: 'Full HP!', time: 3_000 });
        if (state.hpinfoTimer) clearTimeout(state.hpinfoTimer);
        state.hpinfoTimer = setTimeout(() => { state.hpinfo = true; }, 90_000);
      }

      // Player bad-condition alert (ja_alert_zla), 30 s cooldown
      if (hpLevel === 3 && state.playerBadCondEnabled) {
        const now = Date.now();
        if (now - state.playerBadLastAlert > 30_000) {
          state.playerBadLastAlert = now;
          api.command.send('play_lowhp');
          const row = ' . '.repeat(5) + '  Z L A   K O N D Y C J A  ' + ' . '.repeat(5);
          printAlertBanner(api, row, COL_ALERT_GREEN);
          api.events.emit('notify', { text: 'ZŁA KONDYCJA', time: 5_000 });
        }
      }

      // Barely-alive auto-assist (ja_alert_ledwo), disabled by default
      if (hpLevel === 1 && state.playerLedwoEnabled) {
        api.command.send('plus kondycja');
      }

      return buildPlayerLine(api, hpBase, hpSuffix, hpLevel, attackerDisplay, attackerCount);
    },
    tag,
  );
}
