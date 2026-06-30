import type { PluginApi } from '@arkadia/plugin-types';
import { getMyColor } from '../../../lib/colors/my-colors';
import { getCurrentTeam, getCurrentLeader, getMissingNames, rebuildTeamState, resetTeamState } from './team_state';
import { registerZaslonyTriggers } from './team_zaslony';
import { registerCelTriggers, registerCelTestAlias } from './team_cel';
import { setupAtaki, destroyAtaki } from './team_ataki';

// Re-export the live team state for consumers (and tests) importing from here.
export { getCurrentTeam, getCurrentLeader, getMissingNames } from './team_state';

const TAG = 'mod_team';
const TEAM_COLOR = 9; // #CW 9 — foreground color for team names

// Colors for the diagnostic output.
const COLOR_PREFIX = '#777777'; // "[mod_team]" marker — muted gray
const COLOR_WARN = '#ff8800'; // "Brak w bazie" warning — orange
const COLOR_NAME = '#ffd700'; // a name — gold
const COLOR_CASE = '#888888'; // case labels (B:/C:/...) — gray
const COLOR_FORM = '#cccccc'; // case forms — light gray

// ---- Diagnostic output -------------------------------------------------------

function warnMissing(api: PluginApi, name: string): void {
  const buf = new api.AnsiAwareBuffer();
  buf.append('[mod_team] ', api.colors.fromHex(COLOR_PREFIX));
  buf.append('Brak w bazie: ', api.colors.fromHex(COLOR_WARN));
  buf.append(name, api.colors.fromHex(COLOR_NAME));
  api.output.print(buf);
}

/** Dev echo: dump the live team with every declension (odmiana). */
function printTeam(api: PluginApi): void {
  const team = getCurrentTeam();
  const leader = getCurrentLeader();

  const header = new api.AnsiAwareBuffer();
  header.append('[mod_team] ', api.colors.fromHex(COLOR_PREFIX));
  header.append(`Druzyna (${team.length}):`, api.colors.fromHex(COLOR_NAME));
  api.output.print(header);

  for (const m of team) {
    const lead = leader && leader.M === m.M ? '* ' : '  ';
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

// ---- Live-team rebuild -------------------------------------------------------

/** Rebuild the live team from the client's current team state, then echo it. */
function rebuild(api: PluginApi): void {
  const missing = rebuildTeamState(api);

  for (const name of missing) warnMissing(api, name);

  if (missing.length > 0) {
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

// ---- Coloring trigger (kol_druzyna) ------------------------------------------

/**
 * Colors every occurrence of a current team member's name — in any case form
 * (M/B/C/D/N) — with foreground color 9. The name set is dynamic, so this trigger
 * is rebuilt whenever the team changes.
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
  for (const m of getCurrentTeam()) {
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
let celtestAliasId: string | undefined;

export function setupTeam(api: PluginApi): void {
  teamChangeListener = () => rebuild(api);
  api.events.on('teamChange', teamChangeListener);

  // Reachable by command as well as by the functional bind.
  wylapAliasId = api.aliases.register(/^wylap$/i, () => {
    runWylap(api, getMissingNames());
    return true;
  });

  registerZaslonyTriggers(api, TAG);
  registerCelTriggers(api, TAG);
  celtestAliasId = registerCelTestAlias(api);
  setupAtaki(api, TAG);

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
  if (celtestAliasId) {
    api.aliases.remove(celtestAliasId);
    celtestAliasId = undefined;
  }
  destroyAtaki(api);
  api.bind.clear();
  api.triggers.removeByTag(TAG);
  coloringTrigger = null;

  resetTeamState();
}
