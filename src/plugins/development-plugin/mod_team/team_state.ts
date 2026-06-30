import type { PluginApi } from '@arkadia/plugin-types';
import { DRUZYNA_NAMES, type DruzynaName } from './team_names';

/**
 * Live team state and declension lookups — the data layer shared by the team
 * orchestrator (team.ts) and the zaslona triggers (team_zaslony.ts).
 */

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

/**
 * Recompute the live team (members, leader, missing names) from the client's
 * current team state. Pure state update — no output, no triggers. Returns the
 * names that could not be declined, for the caller to warn about.
 */
export function rebuildTeamState(api: PluginApi): string[] {
  const members = api.team.getMembers() ?? [];
  const leaderName = api.team.getLeader();

  currentTeam = [];
  missingNames = [];

  for (const name of members) {
    if (isSelf(name)) continue; // the player is never in the DB
    const { entry, missing } = resolveName(name);
    currentTeam.push(entry);
    if (missing) missingNames.push(name);
  }

  if (leaderName && !isSelf(leaderName)) {
    const { entry, missing } = resolveName(leaderName);
    currentLeader = entry;
    // Leader may not be among getMembers(); track it as missing too (once).
    if (missing && !missingNames.includes(leaderName)) missingNames.push(leaderName);
  } else {
    currentLeader = undefined;
  }

  return missingNames;
}

/** Drop all live team state (used on plugin teardown). */
export function resetTeamState(): void {
  currentTeam = [];
  currentLeader = undefined;
  missingNames = [];
}

// ---- Bind labels -------------------------------------------------------------

/** CMUD `lista_bindow` — bind label per team slot. Only the first 10 (q–p). */
export const LISTA_BINDOW = ['QQ', 'WW', 'EE', 'RR', 'TT', 'YY', 'UU', 'II', 'OO', 'PP'] as const;

/** Bind label for a 0-based team slot index, or '' when out of range. */
export function teamBindLabel(index: number): string {
  return LISTA_BINDOW[index] ?? '';
}

// ---- Case-form lookups (used by the zaslona triggers) ------------------------

/** Lowercased dopelniacz (D) forms of the current team, for fast matching. */
export function teamGenitiveForms(): Set<string> {
  return new Set(currentTeam.map((m) => m.D.toLowerCase()));
}

/** Lowercased mianownik (M) forms of the current team, for fast matching. */
export function teamNominativeForms(): Set<string> {
  return new Set(currentTeam.map((m) => m.M.toLowerCase()));
}

/**
 * Team slot index of the member whose biernik (B) form equals `form`
 * (case-insensitive), or -1. CMUD `%ismember(%2, @druzynaB)`.
 */
export function teamIndexByBiernik(form: string): number {
  const f = form.toLowerCase();
  return currentTeam.findIndex((m) => m.B.toLowerCase() === f);
}

/**
 * Team slot index of the member whose narzednik (N) form equals `form`
 * (case-insensitive), or -1. CMUD `%ismember(%2, @druzynaN)`.
 */
export function teamIndexByNarzednik(form: string): number {
  const f = form.toLowerCase();
  return currentTeam.findIndex((m) => m.N.toLowerCase() === f);
}
