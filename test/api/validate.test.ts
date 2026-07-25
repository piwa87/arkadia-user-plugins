import { describe, expect, it } from 'vitest';
import { walidujGlos, walidujZgloszenie } from '../../api/src/validate';
import type { ZgloszenieRequest } from '../../src/shared/rkg-api';

const G = 'ddevice-1234-5678-abcd'; // valid glosujacy id

function poprawne(over: Partial<ZgloszenieRequest> = {}): ZgloszenieRequest {
  return {
    typ: 'liga',
    przymiotnik: 'pokretny',
    rzeczownik: 'zmora',
    liczba: 'mnogiej',
    przypadek: 'dopelniaczu',
    wynik: 'Liga Pokretnych Zmor',
    glosujacy: G,
    ...over,
  };
}

describe('walidujZgloszenie — accepts', () => {
  it('a real generated name', () => {
    const r = walidujZgloszenie(poprawne());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dane.klucz).toBe('liga pokretnych zmor');
      expect(r.dane.wynik).toBe('Liga Pokretnych Zmor');
    }
  });

  it('a two-word type and a three-word name (two-word noun)', () => {
    const r = walidujZgloszenie(
      poprawne({
        typ: 'spolka handlowa',
        przymiotnik: 'gleboki',
        rzeczownik: 'fajka',
        wynik: 'Spolka Handlowa Glebokiej Fajki',
      }),
    );
    expect(r.ok).toBe(true);
  });

  it('optional roles when well-formed', () => {
    const r = walidujZgloszenie(
      poprawne({
        role: { przywodca: 'Starszy Ligi', zastepca: 'Zaufany Ligi', czlonek: 'Uczestnik Ligi' },
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dane.role?.przywodca).toBe('Starszy Ligi');
  });

  it('an optional nick', () => {
    const r = walidujZgloszenie(poprawne({ nick: 'Piot' }));
    expect(r.ok && r.dane.nick).toBe('Piot');
  });
});

describe('walidujZgloszenie — rejects', () => {
  const cases: [string, unknown][] = [
    ['non-object', 'nope'],
    ['unknown type', poprawne({ typ: 'sekta' })],
    ['unknown adjective', poprawne({ przymiotnik: 'niewiadomy' })],
    ['adjective not matching the name', poprawne({ przymiotnik: 'wesoly' })],
    ['type not matching the name', poprawne({ typ: 'banda' })],
    ['html injected into wynik', poprawne({ wynik: 'Liga <script>x</script> Zmor' })],
    ['trailing free text in wynik', poprawne({ wynik: 'Liga Pokretnych Zmor i cos' })],
    ['four words in wynik', poprawne({ wynik: 'Liga Aaa Bbb Ccc Ddd' })],
    ['bad liczba', poprawne({ liczba: 'zadnej' as never })],
    ['bad noun', poprawne({ rzeczownik: 'a; DROP TABLE nazwy' })],
    ['too-short glosujacy', poprawne({ glosujacy: 'x' })],
    ['bad nick', poprawne({ nick: '!!' })],
    ['role with markup', poprawne({ role: { przywodca: '<b>x</b>', zastepca: '', czlonek: '' } })],
  ];

  for (const [name, body] of cases) {
    it(name, () => {
      const r = walidujZgloszenie(body);
      expect(r.ok).toBe(false);
    });
  }
});

describe('walidujGlos', () => {
  it('accepts +1 / -1 / 0', () => {
    for (const wartosc of [1, -1, 0] as const) {
      expect(walidujGlos({ glosujacy: G, wartosc }).ok).toBe(true);
    }
  });

  it('rejects a bad value or id', () => {
    expect(walidujGlos({ glosujacy: G, wartosc: 5 }).ok).toBe(false);
    expect(walidujGlos({ glosujacy: 'x', wartosc: 1 }).ok).toBe(false);
    expect(walidujGlos(null).ok).toBe(false);
  });
});
