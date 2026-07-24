import { describe, expect, it } from 'vitest';
import { pick, proper } from '../../../src/plugins/rkg-plugin/generator';
import { RKG_PRZYMIOTNIKI, ZABRONIONE } from '../../../src/plugins/rkg-plugin/data/adjectives';
import { RKG_TYPY } from '../../../src/plugins/rkg-plugin/data/types';
import { RZECZOWNIKI_SEED } from '../../../src/plugins/rkg-plugin/data/seed';

describe('pick', () => {
  it('only ever returns members of the list', () => {
    const lista = ['a', 'b', 'c'];
    for (let i = 0; i < 200; i++) expect(lista).toContain(pick(lista));
  });

  it('can reach every element', () => {
    const widziane = new Set<string>();
    const lista = ['a', 'b', 'c'];
    for (let i = 0; i < 500; i++) widziane.add(pick(lista));
    expect(widziane.size).toBe(3);
  });

  it('throws on an empty list rather than returning undefined', () => {
    expect(() => pick([])).toThrow(/pusta/);
  });
});

describe('proper', () => {
  it('capitalises every word (CMud %proper)', () => {
    expect(proper('spolka handlowa')).toBe('Spolka Handlowa');
    expect(proper('banda')).toBe('Banda');
  });

  it('leaves already-capitalised text alone', () => {
    expect(proper('Liga Pokretnych Zmor')).toBe('Liga Pokretnych Zmor');
  });
});

describe('word lists', () => {
  it('ported the CMud lists at the expected size', () => {
    // 19 in the CMud export + `loza`, which the live dialogue offers.
    expect(RKG_TYPY).toHaveLength(20);
    expect(RKG_TYPY).toContain('loza');
    // 970 unique in the CMud export, minus the 8 in ZABRONIONE.
    expect(RKG_PRZYMIOTNIKI).toHaveLength(962);
  });

  it('has no duplicates or stray whitespace', () => {
    expect(new Set(RKG_PRZYMIOTNIKI).size).toBe(RKG_PRZYMIOTNIKI.length);
    expect(RKG_PRZYMIOTNIKI.every((w) => w === w.trim() && w.length > 0)).toBe(true);
  });

  it('is ASCII only — Polish diacritics break the client regexes', () => {
    const zle = [...RKG_TYPY, ...RKG_PRZYMIOTNIKI].filter((w) => !/^[a-z ]+$/.test(w));
    expect(zle).toEqual([]);
  });

  it('excludes every denied adjective', () => {
    for (const slowo of ZABRONIONE) expect(RKG_PRZYMIOTNIKI).not.toContain(slowo);
  });
});

describe('noun base', () => {
  it('flattens and de-duplicates every category', () => {
    expect(RZECZOWNIKI_SEED.length).toBeGreaterThan(400);
    expect(new Set(RZECZOWNIKI_SEED).size).toBe(RZECZOWNIKI_SEED.length);
  });

  it('is lowercase ASCII (two-word nouns like "potwor morski" allowed)', () => {
    const zle = RZECZOWNIKI_SEED.filter((w) => !/^[a-z]+( [a-z]+)?$/.test(w));
    expect(zle).toEqual([]);
  });

  it('contains representative nouns from several categories', () => {
    for (const n of ['korbacz', 'smok', 'ksiezyc', 'potwor morski', 'tarcza', 'klucz']) {
      expect(RZECZOWNIKI_SEED).toContain(n);
    }
  });
});
