import { describe, expect, it } from 'vitest';
import {
  normalizuj,
  pasujeRdzen,
  rdzen,
  WZORZEC_NICKA,
  WZORZEC_RZECZOWNIKA,
  wzorzecLiniiGry,
  wzorzecNazwy,
} from '../../../src/shared/rkg-grammar';
import { RKG_PRZYMIOTNIKI } from '../../../src/plugins/rkg-plugin/data/adjectives';
import { NAZWY_KLUBOW } from './fixtures';
import { RKG_TYPY } from '../../../src/plugins/rkg-plugin/data/types';

const liniaGry = wzorzecLiniiGry(RKG_TYPY);
const nazwa = wzorzecNazwy(RKG_TYPY);

describe('wzorzecLiniiGry', () => {
  it('captures the indented name the game prints', () => {
    const m = '        Liga Pokretnych Zmor'.match(liniaGry);
    expect(m?.[1]).toBe('Liga Pokretnych Zmor');
  });

  it('handles the two-word type without truncating it', () => {
    const m = '    Spolka Handlowa Glebokiej Fajki'.match(liniaGry);
    expect(m?.[1]).toBe('Spolka Handlowa Glebokiej Fajki');
  });

  it('ignores unindented lines and unknown types', () => {
    expect(liniaGry.test('Liga Pokretnych Zmor')).toBe(false);
    expect(liniaGry.test('    Sekta Pokretnych Zmor')).toBe(false);
  });
});

describe('wzorzecNazwy', () => {
  it('accepts every name the CMud module had collected', () => {
    const odrzucone = NAZWY_KLUBOW.filter((n) => !nazwa.test(n));
    expect(odrzucone).toEqual([]);
  });

  it('rejects free text smuggled past the type', () => {
    expect(nazwa.test('Banda <script>alert(1)</script> Pled')).toBe(false);
    expect(nazwa.test('Banda Pospieszny Pled i jeszcze cos')).toBe(false);
    expect(nazwa.test('Sekta Pospieszny Pled')).toBe(false);
    expect(nazwa.test('Banda Pospieszny')).toBe(false);
    expect(nazwa.test(`Banda ${'A'.repeat(40)} Pled`)).toBe(false);
  });
});

describe('rdzen / pasujeRdzen', () => {
  it('strips the adjective ending', () => {
    expect(rdzen('pokretny')).toBe('pokretn');
    expect(rdzen('gleboki')).toBe('glebok');
    expect(rdzen('tepy')).toBe('tep');
  });

  it('accepts real inflections, including the short ones', () => {
    // A fixed 4-char prefix rule would reject these two.
    expect(pasujeRdzen('tepy', 'Tepe')).toBe(true);
    expect(pasujeRdzen('mily', 'Mile')).toBe(true);
    expect(pasujeRdzen('pokretny', 'Pokretnych')).toBe(true);
    expect(pasujeRdzen('gleboki', 'Glebokiej')).toBe(true);
    expect(pasujeRdzen('cichy', 'Ciche')).toBe(true);
  });

  it('rejects an unrelated word', () => {
    expect(pasujeRdzen('pokretny', 'Wesolych')).toBe(false);
    expect(pasujeRdzen('pokretny', 'Zzzz')).toBe(false);
  });

  it('accepts 103 of the 104 real names against the full word list', () => {
    // The one rejection is `Kompania Kupiecka Tarcza` — `kupiecki` is not in the
    // word list at all, i.e. a pre-existing club the CMud trigger scraped rather
    // than one the generator produced. Refusing it on the wall is correct.
    const stems = RKG_PRZYMIOTNIKI.map(rdzen).filter((s) => s.length >= 3);
    const przymiotnikZ = (pelna: string) => {
      const typ = [...RKG_TYPY]
        .sort((a, b) => b.length - a.length)
        .find((t) => pelna.toLowerCase().startsWith(`${t} `))!;
      return pelna.slice(typ.length + 1).split(' ')[0];
    };
    const odrzucone = NAZWY_KLUBOW.filter(
      (n) => !stems.some((s) => przymiotnikZ(n).toLowerCase().startsWith(s)),
    );
    expect(odrzucone).toEqual(['Kompania Kupiecka Tarcza']);
  });
});

describe('normalizuj', () => {
  it('folds case and collapses whitespace so duplicates land on one row', () => {
    expect(normalizuj('  Liga   Pokretnych  Zmor ')).toBe('liga pokretnych zmor');
    expect(normalizuj('LIGA POKRETNYCH ZMOR')).toBe(normalizuj('Liga Pokretnych Zmor'));
  });
});

describe('field patterns', () => {
  it('accepts harvested nouns of one or two words', () => {
    expect(WZORZEC_RZECZOWNIKA.test('zastepca')).toBe(true);
    expect(WZORZEC_RZECZOWNIKA.test('czesci ciala')).toBe(true);
    expect(WZORZEC_RZECZOWNIKA.test('a')).toBe(false);
    expect(WZORZEC_RZECZOWNIKA.test('drop table nazwy')).toBe(false);
  });

  it('constrains the public nick', () => {
    expect(WZORZEC_NICKA.test('Piot')).toBe(true);
    expect(WZORZEC_NICKA.test('a')).toBe(false);
    expect(WZORZEC_NICKA.test('nick z spacja')).toBe(false);
  });
});
