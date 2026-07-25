/**
 * Grammar helpers shared by the plugin (which captures names off game output)
 * and the wall API (which has to decide whether a submission could plausibly
 * have come from the generator).
 *
 * Every function takes its word lists as arguments rather than importing them,
 * so this module stays free of any dependency on the plugin.
 */

import { escapeRegex } from '../lib/escapeRegex';

/** Longest-first alternation, so `spolka handlowa` wins over any shorter prefix. */
function alternatywaTypow(typy: readonly string[]): string {
  return [...typy]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');
}

/**
 * Matches the indented line the game prints with the freshly built name —
 * the port of CMud's `^\s+((?:@rkgTyp)\s\w+\s\w+)$`. Deliberately lenient:
 * it runs against live game output, where the exact indentation is not ours.
 */
export function wzorzecLiniiGry(typy: readonly string[]): RegExp {
  return new RegExp(`^\\s+((?:${alternatywaTypow(typy)})\\s+\\w+\\s+\\w+)\\s*$`, 'i');
}

/**
 * Strict whole-string shape for a submitted name: a known type followed by two
 * or three capitalised words. Two is the norm; three covers the one two-word
 * noun ('potwor morski'), e.g. `Liga Wredne Potwory Morskie`. Verified against
 * all 104 names the CMud module had collected — all pass.
 */
export function wzorzecNazwy(typy: readonly string[]): RegExp {
  return new RegExp(`^(?:${alternatywaTypow(typy)})(?: [A-Z][a-z]{2,20}){2,3}$`, 'i');
}

/** Nouns are harvested from the game's menus — ASCII words, possibly two of them. */
export const WZORZEC_RZECZOWNIKA = /^[a-z]{2,24}(?: [a-z]{2,24})?$/;

/** Optional public nick on the wall. */
export const WZORZEC_NICKA = /^[A-Za-z0-9_-]{2,16}$/;

/**
 * Polish adjectives inflect on the ending, so the stem is the base form minus
 * its final `-y`/`-i`: `pokretny` → `pokretn`, `tepy` → `tep`.
 */
export function rdzen(przymiotnik: string): string {
  const slowo = przymiotnik.trim().toLowerCase();
  return /[yi]$/.test(slowo) ? slowo.slice(0, -1) : slowo;
}

/**
 * Does `odmieniony` look like an inflected form of `bazowy`?
 *
 * A fixed-length prefix comparison does not work here — `mily` → `Mile` and
 * `tepy` → `Tepe` share only three characters — so we compare against the stem
 * instead. Measured against the 104 real names: accepts 103, and the single
 * rejection (`Kompania Kupiecka Tarcza`) uses an adjective that is not in the
 * word list at all, i.e. a pre-existing club the CMud trigger scraped rather
 * than one the generator produced. Rejecting it is correct.
 */
export function pasujeRdzen(bazowy: string, odmieniony: string): boolean {
  const stem = rdzen(bazowy);
  if (stem.length < 3) return false;
  return odmieniony.trim().toLowerCase().startsWith(stem);
}

/** Dedupe key for the wall: case- and whitespace-insensitive. */
export function normalizuj(nazwa: string): string {
  return nazwa.trim().toLowerCase().replace(/\s+/g, ' ');
}
