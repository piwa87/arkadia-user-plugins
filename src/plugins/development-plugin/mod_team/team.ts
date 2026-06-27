import type { PluginApi } from '@arkadia/plugin-types';
import { DRUZYNA_NAMES, type DruzynaName } from './team_names';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';

const TAG = 'mod_team';
const TEAM_COLOR = 9; // #CW 9 — foreground color for team names

// Colors for the diagnostic output.
const COLOR_PREFIX = '#777777'; // "[mod_team]" marker — muted gray
const COLOR_WARN = '#ff8800'; // "Brak w bazie" warning — orange
const COLOR_NAME = '#ffd700'; // a name — gold
const COLOR_CASE = '#888888'; // case labels (B:/C:/...) — gray
const COLOR_FORM = '#cccccc'; // case forms — light gray

/**
 * Master-DB index, keyed on lowercased mianownik (M). Built lazily once from
 * DRUZYNA_NAMES so repeated team rebuilds are O(team size), not O(db size).
 */
let nameIndex: Map<string, DruzynaName> | null = null;
function getNameIndex(): Map<string, DruzynaName> {
  if (!nameIndex) {
    nameIndex = new Map();
    for (const entry of DRUZYNA_NAMES) {
      nameIndex.set(entry.M.toLowerCase(), entry);
    }
  }
  return nameIndex;
}

// ---- Live team state ---------------------------------------------------------

let currentTeam: DruzynaName[] = [];
let currentLeader: DruzynaName | undefined;
let missingNames: string[] = [];

/** The active team as declension objects, in the order reported by the client. */
export function getCurrentTeam(): DruzynaName[] {
  return currentTeam;
}

/** The active team leader as a declension object, if any. */
export function getCurrentLeader(): DruzynaName | undefined {
  return currentLeader;
}

/** Current-team names that were not found in the team_names DB. */
export function getMissingNames(): string[] {
  return missingNames;
}

// ---- Lookup + build ----------------------------------------------------------

/**
 * The client lists the player themselves as "Ty (gracz)". The player is never
 * in the name DB and must be skipped entirely.
 */
function isSelf(name: string): boolean {
  return name.trim().toLowerCase().includes('(gracz)');
}

/**
 * Resolve a base (mianownik) name against the DB. Unknown names get a fallback
 * object whose every case form is the raw name (legacy "Brak w bazie" path).
 */
function resolveName(name: string): { entry: DruzynaName; missing: boolean } {
  const found = getNameIndex().get(name.toLowerCase());
  if (found) return { entry: found, missing: false };
  return { entry: { M: name, B: name, C: name, D: name, N: name }, missing: true };
}

function warnMissing(api: PluginApi, name: string): void {
  const buf = new api.AnsiAwareBuffer();
  buf.append('[mod_team] ', api.colors.fromHex(COLOR_PREFIX));
  buf.append('Brak w bazie: ', api.colors.fromHex(COLOR_WARN));
  buf.append(name, api.colors.fromHex(COLOR_NAME));
  api.output.print(buf);
}

/** Dev echo: dump the live team with every declension (odmiana). */
function printTeam(api: PluginApi): void {
  const header = new api.AnsiAwareBuffer();
  header.append('[mod_team] ', api.colors.fromHex(COLOR_PREFIX));
  header.append(`Druzyna (${currentTeam.length}):`, api.colors.fromHex(COLOR_NAME));
  api.output.print(header);

  for (const m of currentTeam) {
    const lead = currentLeader && currentLeader.M === m.M ? '* ' : '  ';
    const buf = new api.AnsiAwareBuffer();
    buf.append(`  ${lead}`, api.colors.fromHex(COLOR_PREFIX));
    buf.append(m.M.padEnd(14), api.colors.fromHex(COLOR_NAME));
    for (const [label, form] of [
      ['B', m.B],
      ['C', m.C],
      ['D', m.D],
      ['N', m.N],
    ] as const) {
      buf.append(` ${label}:`, api.colors.fromHex(COLOR_CASE));
      buf.append(form, api.colors.fromHex(COLOR_FORM));
    }
    api.output.print(buf);
  }
}

/** Rebuild the live team from the client's current team state. */
function rebuild(api: PluginApi): void {
  const members = api.team.getMembers() ?? [];
  const leaderName = api.team.getLeader();

  currentTeam = [];
  missingNames = [];

  for (const name of members) {
    if (isSelf(name)) continue; // the player is never in the DB
    const { entry, missing } = resolveName(name);
    currentTeam.push(entry);
    if (missing) {
      missingNames.push(name);
      warnMissing(api, name);
    }
  }

  if (leaderName && !isSelf(leaderName)) {
    const { entry, missing } = resolveName(leaderName);
    currentLeader = entry;
    // Leader may not be among getMembers(); track it as missing too (once).
    if (missing && !missingNames.includes(leaderName)) {
      missingNames.push(leaderName);
      warnMissing(api, leaderName);
    }
  } else {
    currentLeader = undefined;
  }

  if (missingNames.length > 0) {
    // Pre-wire a key bind so the user can fire the (future) wylap capture for
    // the names we could not decline. The capture itself is implemented later.
    api.bind.set(null, () => runWylap(api, getMissingNames()));
    const buf = new api.AnsiAwareBuffer();
    buf.append('[mod_team] ', api.colors.fromHex(COLOR_PREFIX));
    buf.append(`Nacisnij ${api.bind.getLabel()}, aby odmienic brakujace.`, api.colors.fromHex(COLOR_WARN));
    api.output.print(buf);
  }

  rebuildColoringTrigger(api);
  printTeam(api);
}

// ---- wylap (stub — implemented in a later step) ------------------------------

/**
 * Capture declensions for names missing from the DB.
 * TODO: implement wylap capture (legacy `wylap` / `odmien` flow that asks the
 * game to decline a name and writes the forms back into team_names).
 */
function runWylap(api: PluginApi, names: string[]): void {
  const buf = new api.AnsiAwareBuffer();
  buf.append('[mod_team] ', api.colors.fromHex(COLOR_PREFIX));
  if (names.length === 0) {
    buf.append('wylap: brak nazw do odmiany.', api.colors.fromHex(COLOR_WARN));
  } else {
    buf.append(`wylap (TODO): odmienilbym ${names.join(', ')}`, api.colors.fromHex(COLOR_WARN));
  }
  api.output.print(buf);
}

// ---- Triggers using the odmiany ----------------------------------------------

/** Lowercased dopelniacz (D) forms of the current team, for fast matching. */
function teamGenitiveForms(): Set<string> {
  return new Set(currentTeam.map((m) => m.D.toLowerCase()));
}

/**
 * Port of CMUD `zas_przed_team`: "<X> zrecznie zaslania <Y> przed ciosami <Z>."
 * where <Z> is a current team member in dopelniacz. Gags the line and prints a
 * highlighted PRZED DRUZYNA banner, then plays the morse sound.
 */
function registerZaslonaTrigger(api: PluginApi): void {
  const hi = getAnsiFormatState(38, api); // %ansi(38) — banner highlight
  const def = getAnsiFormatState(0, api); // %ansi(0) — reset

  api.triggers.register(
    /^(.*) zrecznie zaslania (.*) przed ciosami (.+)\./,
    (line, matches) => {
      const shielder = matches[3]?.trim().toLowerCase() ?? '';
      if (!teamGenitiveForms().has(shielder)) return line; // not our team — pass through

      // Rewrite the line in place (CMUD #SUB). Do NOT api.output.print() from a
      // trigger callback — that queues and flushes on the next output cycle.
      line.clear();
      line.append('         PRZED DRUZYNA        ', hi);
      line.append('     ', def);
      line.append(matches[1], def);
      line.append('     ', def);
      line.append(' z a s l a n i a ', hi);
      line.append('     ', def);
      line.append(matches[2], def);
      line.append('     przed     ', def);
      line.append(matches[3], def);

      api.command.send('play_morse');
      return line;
    },
    TAG,
  );
}

/**
 * Port of CMUD `kol_druzyna`: colors every occurrence of a current team member's
 * name — in any case form (M/B/C/D/N) — with foreground color 9. The name set is
 * dynamic, so this trigger is rebuilt whenever the team changes.
 */
let coloringTrigger: ReturnType<PluginApi['triggers']['register']> | null = null;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rebuildColoringTrigger(api: PluginApi): void {
  if (coloringTrigger) {
    api.triggers.remove(coloringTrigger);
    coloringTrigger = null;
  }

  // All distinct name forms across the team's declensions.
  const forms = new Set<string>();
  for (const m of currentTeam) {
    forms.add(m.M);
    forms.add(m.B);
    forms.add(m.C);
    forms.add(m.D);
    forms.add(m.N);
  }
  if (forms.size === 0) return;

  // Longest-first so e.g. "Vindaelowi" wins over "Vindael" at the same position.
  const alt = [...forms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');
  const source = `\\b(?:${alt})\\b`;
  const color = getMyColor(TEAM_COLOR, api);
  const scan = new RegExp(source, 'g');

  coloringTrigger = api.triggers.register(
    new RegExp(source),
    (line) => {
      scan.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = scan.exec(line.text)) !== null) {
        line.color([m.index, m.index + m[0].length], color);
        if (m.index === scan.lastIndex) scan.lastIndex++; // zero-length guard
      }
      return line;
    },
    TAG,
  );
}

// ---- Lifecycle ---------------------------------------------------------------

let teamChangeListener: (() => void) | null = null;
let wylapAliasId: string | undefined;

export function setupTeam(api: PluginApi): void {
  teamChangeListener = () => rebuild(api);
  api.events.on('teamChange', teamChangeListener);

  // Reachable by command as well as by the functional bind.
  wylapAliasId = api.aliases.register(/^wylap$/i, () => {
    runWylap(api, getMissingNames());
    return true;
  });

  registerZaslonaTrigger(api);

  // Initial state.
  rebuild(api);
}

export function destroyTeam(api: PluginApi): void {
  if (teamChangeListener) {
    api.events.off('teamChange', teamChangeListener);
    teamChangeListener = null;
  }
  if (wylapAliasId) {
    api.aliases.remove(wylapAliasId);
    wylapAliasId = undefined;
  }
  api.bind.clear();
  api.triggers.removeByTag(TAG);
  coloringTrigger = null;

  currentTeam = [];
  currentLeader = undefined;
  missingNames = [];
}
