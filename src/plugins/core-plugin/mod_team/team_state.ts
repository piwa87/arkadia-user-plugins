import type { PluginApi } from '@arkadia/plugin-types';
import { storage } from '../../../lib/storage';
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

// ---- Learned names (wylap capture) -------------------------------------------

/**
 * Names declined at runtime by the `wylap` capture (game `odmien <name>`) and
 * persisted in localStorage. They shadow nothing — they are consulted only for
 * names the generated master DB does not know.
 */
const LEARNED_KEY = 'mod_team:odmiany';

let learnedIndex: Map<string, DruzynaName> | null = null;

function getLearnedIndex(): Map<string, DruzynaName> {
  if (!learnedIndex) {
    learnedIndex = new Map();
    for (const entry of storage.get<DruzynaName[]>(LEARNED_KEY) ?? []) {
      learnedIndex.set(entry.M.toLowerCase(), entry);
    }
  }
  return learnedIndex;
}

/** All runtime-learned declensions, in insertion order. */
export function getLearnedNames(): DruzynaName[] {
  return [...getLearnedIndex().values()];
}

/** Store a captured declension (in memory + localStorage). Overwrites by M. */
export function learnName(entry: DruzynaName): void {
  const index = getLearnedIndex();
  index.set(entry.M.toLowerCase(), entry);
  try {
    storage.set(LEARNED_KEY, [...index.values()]);
  } catch {
    // No localStorage (tests / restricted context) — keep the in-memory copy.
  }
}

/** Drop all learned declensions, in memory and on disk. Used by `wylap zapomnij`. */
export function forgetLearnedNames(): void {
  learnedIndex = new Map();
  try {
    storage.remove(LEARNED_KEY);
  } catch {
    // No localStorage — the in-memory reset above is all we can do.
  }
}

// ---- Live team state ---------------------------------------------------------

let currentTeam: DruzynaName[] = [];
let currentLeader: DruzynaName | undefined;
let missingNames: string[] = [];

/**
 * CMUD `zaslona_przed_ja` — true while someone is shielding an enemy from the
 * player's blows. Set by the "PRZED TOBA" zaslona lines (team_zaslony.ts) and by
 * "Atakujesz X, lecz Y zagradza ci droge."; cleared when the shield is broken or
 * when the game reports "Nikt nie zaslania ..." (team_lamanie.ts).
 */
let shieldedAgainstMe = false;

// Case-form sets are read from trigger callbacks on every matching combat
// line — memoize them and invalidate whenever currentTeam changes.
let genitiveForms: Set<string> | null = null;
let nominativeForms: Set<string> | null = null;

function invalidateFormCaches(): void {
  genitiveForms = null;
  nominativeForms = null;
}

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
 * Resolve a base (mianownik) name against the master DB, then against the names
 * learned by `wylap`. Unknown names get a fallback object whose every case form
 * is the raw name (legacy "Brak w bazie" path).
 */
function resolveName(name: string): { entry: DruzynaName; missing: boolean } {
  const key = name.toLowerCase();
  const found = getNameIndex().get(key) ?? getLearnedIndex().get(key);
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
  invalidateFormCaches();

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
  shieldedAgainstMe = false;
  invalidateFormCaches();
}

// ---- Shielded-against-me flag (CMUD `zaslona_przed_ja`) ----------------------

/** True while an enemy is being shielded from the player's blows. */
export function isShieldedAgainstMe(): boolean {
  return shieldedAgainstMe;
}

/** Set/clear the "someone is shielded from me" flag. */
export function setShieldedAgainstMe(value: boolean): void {
  shieldedAgainstMe = value;
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
  if (!genitiveForms) genitiveForms = new Set(currentTeam.map((m) => m.D.toLowerCase()));
  return genitiveForms;
}

/** Lowercased mianownik (M) forms of the current team, for fast matching. */
export function teamNominativeForms(): Set<string> {
  if (!nominativeForms) nominativeForms = new Set(currentTeam.map((m) => m.M.toLowerCase()));
  return nominativeForms;
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

/**
 * Team slot index of the member whose celownik (C) form equals `form`
 * (case-insensitive), or -1. CMUD `%ismember(%2, @druzynaC)`.
 */
export function teamIndexByCelownik(form: string): number {
  const f = form.toLowerCase();
  return currentTeam.findIndex((m) => m.C.toLowerCase() === f);
}

/**
 * Team slot index of the member whose dopelniacz (D) form equals `form`
 * (case-insensitive), or -1. CMUD `%ismember(%2, @druzynaD)`.
 */
export function teamIndexByDopelniacz(form: string): number {
  const f = form.toLowerCase();
  return currentTeam.findIndex((m) => m.D.toLowerCase() === f);
}
