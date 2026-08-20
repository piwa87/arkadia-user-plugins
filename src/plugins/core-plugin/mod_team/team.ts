import type { PluginApi } from '@arkadia/plugin-types';
import { getMissingNames, getLearnedNames, forgetLearnedNames, rebuildTeamState, resetTeamState } from './team_state';
import { startWylap, cancelWylap, printLearned } from './team_wylap';
import { registerZaslonyTriggers } from './team_zaslony';
import { setupLamanie, destroyLamanie } from './team_lamanie';
import { setupBlok, destroyBlok } from './team_blok';
import { destroyTeamColors, rebuildTeamColorTokens } from './team_colors';
import { registerCelTriggers } from './team_cel';
import { setupAtaki, destroyAtaki } from './team_ataki';
import { setupLider, destroyLider } from './team_lider';
import { setupTeamCommandAliases, destroyTeamCommandAliases } from './team_aliases';

/**
 * mod_team — the team module (ported from CMUD `mod_druzyna`).
 *
 * Owns the live team as declension objects and everything keyed on them: shield
 * (zaslony), shield-breaking (lamanie) and blocking (blok) banners, attack
 * banners, cel ataku/obrony, team-name coloring, leadership handover, and the
 * `wylap` declension capture.
 *
 * Output is intentionally quiet: nothing is printed on a team rebuild unless a
 * member cannot be declined, in which case the missing names are reported and
 * the capture is offered (bind + `wylap` command).
 */

// Re-export the live team state for consumers (and tests) importing from here.
export { getCurrentTeam, getCurrentLeader, getMissingNames } from './team_state';

const TAG = 'mod_team';

// Colors for the team messages.
const COLOR_PREFIX = '#777777'; // "[druzyna]" marker — muted gray
const COLOR_WARN = '#ff8800'; // "Brak w bazie" warning — orange
const COLOR_NAME = '#ffd700'; // a name — gold

/**
 * "Brak w bazie: <name>" — this member cannot be declined, so every feature
 * keyed on their case forms (shield banners, attack labels, coloring) will miss
 * them until `wylap` fills the gap.
 */
function warnMissing(api: PluginApi, name: string): void {
  const buf = new api.AnsiAwareBuffer();
  buf.append('[druzyna] ', api.colors.fromHex(COLOR_PREFIX));
  buf.append('Brak w bazie: ', api.colors.fromHex(COLOR_WARN));
  buf.append(name, api.colors.fromHex(COLOR_NAME));
  api.output.print(buf);
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

/**
 * Rebuild the live team from the client's current team state. Silent unless a
 * member cannot be declined — then it warns per name and offers the capture.
 */
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
    buf.append('[druzyna] ', api.colors.fromHex(COLOR_PREFIX));
    buf.append(
      `Wpisz "wylap" (lub nacisnij ${api.bind.getLabel()}), aby odmienic brakujace. ` +
        '"wylap <imie>" odmienia pojedyncza nazwe.',
      api.colors.fromHex(COLOR_WARN),
    );
    api.output.print(buf);
  }

  rebuildTeamColorTokens(api);
}

// ---- Lifecycle ---------------------------------------------------------------

let teamChangeListener: (() => void) | null = null;
let wylapAliasId: string | undefined;

export function setupTeam(api: PluginApi): void {
  setupTeamCommandAliases(api);
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
  setupLamanie(api, TAG);
  setupBlok(api, TAG);
  registerCelTriggers(api, TAG);
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
  destroyTeamCommandAliases(api);
  destroyAtaki(api);
  destroyLider(api);
  destroyLamanie(api); // clears the auto-attack cooldown timer + its aliases
  destroyBlok(api); // clears the countdown timer, footer and mapMove listener
  cancelWylap(api); // drops the wylap parsers + watchdog if a capture is mid-flight
  api.bind.clear();
  api.triggers.removeByTag(TAG);
  destroyTeamColors(api);

  resetTeamState();
}
