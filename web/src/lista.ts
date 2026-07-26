import type { Pozycja } from '../../src/shared/rkg-api';

/**
 * Board paging, kept out of the DOM code so it can be tested.
 *
 * Both functions exist because of one bug: "Pokaz wiecej" stayed on screen with
 * no next page (an id selector was beating the UA's `[hidden]` rule), so every
 * click re-fetched page one and appended it to itself — two clubs became four,
 * then six. The CSS is fixed; these make the duplicate impossible even if some
 * other path asks for a page that isn't there.
 */

/** Whether there is a next page to ask for at all. */
export function mozeDopisac(cursor: string | undefined, ladowanie: boolean): boolean {
  return !ladowanie && !!cursor;
}

/** Append a page, dropping anything already on the board — a club shows once. */
export function scal(mam: readonly Pozycja[], nowe: readonly Pozycja[]): Pozycja[] {
  const znane = new Set(mam.map((p) => p.id));
  return [...mam, ...nowe.filter((p) => !znane.has(p.id))];
}
