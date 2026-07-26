import { describe, expect, it } from 'vitest';
import { mozeDopisac, scal } from '../../web/src/lista';
import type { Pozycja } from '../../src/shared/rkg-api';

function poz(id: string): Pozycja {
  return { id, wynik: `Klub ${id}`, wynikGlosow: 0, zgloszenia: 1, kiedy: 1 };
}

describe('mozeDopisac', () => {
  it('refuses when there is no next page', () => {
    expect(mozeDopisac(undefined, false)).toBe(false);
  });

  it('refuses while a request is already in flight', () => {
    expect(mozeDopisac('25', true)).toBe(false);
  });

  it('allows a page when the server handed back a cursor', () => {
    expect(mozeDopisac('25', false)).toBe(true);
  });
});

describe('scal', () => {
  it('appends the next page', () => {
    expect(scal([poz('a')], [poz('b')]).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('never shows the same club twice', () => {
    // The shape of the reported bug: the same page fetched again.
    const strona = [poz('a'), poz('b')];
    expect(scal(strona, strona).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('keeps the clubs that are genuinely new', () => {
    expect(scal([poz('a'), poz('b')], [poz('b'), poz('c')]).map((p) => p.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});
