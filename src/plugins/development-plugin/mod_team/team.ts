import type { PluginApi } from '@arkadia/plugin-types';
import { getMyColor } from '../../../lib/colors/my-colors';
import {
  getCurrentTeam,
  getCurrentLeader,
  getMissingNames,
  getLearnedNames,
  forgetLearnedNames,
  rebuildTeamState,
  resetTeamState,
} from './team_state';
import { startWylap, cancelWylap, printLearned } from './team_wylap';
import { registerZaslonyTriggers } from './team_zaslony';
import { destroyTeamColors, rebuildTeamColorTokens } from './team_colors';
import { registerCelTriggers, registerCelTestAlias } from './team_cel';
import { setupAtaki, destroyAtaki } from './team_ataki';
import { setupLider, destroyLider } from './team_lider';

// Re-export the live team state for consumers (and tests) importing from here.
export { getCurrentTeam, getCurrentLeader, getMissingNames } from './team_state';

const TAG = 'mod_team';

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

// ---- wylap -------------------------------------------------------------------

/**
 * Capture declensions for names missing from the DB: asks the game to decline
 * each one (`odmien <name>`), stores the forms, then rebuilds the team so they
 * take effect. Manual only — fired from the functional bind or `wylap`.
 */
function runWylap(api: PluginApi, names: string[]): void {
  startWylap(api, names, () => rebuild(api));
}

// ---- Live-team rebuild -------------------------------------------------------

/** Rebuild the live team from the client's current team state, then echo it. */
function rebuild(api: PluginApi): void {
  const missing = rebuildTeamState(api);

  for (const name of missing) warnMissing(api, name);

  if (missing.length > 0) {
    // Wire the functional bind so the user can fire the wylap capture for the
    // names we could not decline.
    //
    // The printable MUST be non-null: the client only dispatches a key press to
    // a bind slot whose `currentPrintable !== null` (FunctionalBind.isActive),
    // so `set(null, cb)` installs a callback that can never fire. With a
    // printable the callback still wins (FunctionalBind.set prefers it) and the
    // client additionally prints a clickable "bind <key>: wylap" line.
    api.bind.set('wylap', () => runWylap(api, getMissingNames()));
    const buf = new api.AnsiAwareBuffer();
    buf.append('[mod_team] ', api.colors.fromHex(COLOR_PREFIX));
    buf.append(
      `Wpisz "wylap" (lub nacisnij ${api.bind.getLabel()}), aby odmienic brakujace.`,
      api.colors.fromHex(COLOR_WARN),
    );
    api.output.print(buf);
  }

  rebuildTeamColorTokens(api);
  printTeam(api);
}

// ---- Lifecycle ---------------------------------------------------------------

let teamChangeListener: (() => void) | null = null;
let wylapAliasId: string | undefined;
let celtestAliasId: string | undefined;

export function setupTeam(api: PluginApi): void {
  teamChangeListener = () => rebuild(api);
  api.events.on('teamChange', teamChangeListener);

  // Reachable by command as well as by the functional bind — the bind slot is
  // shared with the rest of the client and may be taken over at any moment, so
  // the command form is the reliable one.
  //   wylap             — decline the names currently missing from the DB
  //   wylap <imie> ...  — decline the given name(s), whatever the team state
  //   wylap lista       — print the learned declensions (paste-ready DB lines)
  //   wylap zapomnij    — drop everything learned so far
  wylapAliasId = api.aliases.register(/^wylap(?:\s+(.+))?$/i, (matches) => {
    const arg = matches?.[1]?.trim() ?? '';
    const sub = arg.toLowerCase();
    if (sub === 'lista') {
      printLearned(api, getLearnedNames());
    } else if (sub === 'zapomnij') {
      forgetLearnedNames();
      rebuild(api);
    } else if (arg) {
      // Explicit names — space-separated, e.g. "wylap Jasko Bolko". The game
      // replies with the canonical mianownik, so case here does not matter.
      runWylap(api, arg.split(/\s+/));
    } else {
      runWylap(api, getMissingNames());
    }
    return true;
  });

  registerZaslonyTriggers(api, TAG);
  registerCelTriggers(api, TAG);
  celtestAliasId = registerCelTestAlias(api);
  setupAtaki(api, TAG);
  setupLider(api, TAG);

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
  destroyLider(api);
  cancelWylap(api); // drops the wylap parsers + watchdog if a capture is mid-flight
  api.bind.clear();
  api.triggers.removeByTag(TAG);
  destroyTeamColors(api);

  resetTeamState();
}
