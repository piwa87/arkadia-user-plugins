import { beforeEach, describe, expect, it, vi } from 'vitest';
import { utworzBaze } from '../../../src/plugins/rkg-plugin/store';
import type { WpisLokalny } from '../../../src/shared/rkg-api';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };
}

const DANE: Omit<WpisLokalny, 'id' | 'kiedy' | 'wyslane'> = {
  typ: 'liga',
  przymiotnik: 'pokretny',
  rzeczownik: 'zmora',
  liczba: 'mnogiej',
  przypadek: 'dopelniaczu',
  wynik: 'Liga Pokretnych Zmor',
  charakter: 'jawny',
  plec: 'dowolnej',
  role: { przywodca: 'Przywodca Ligi', zastepca: 'Zaufany Ligi', czlonek: 'Uczestnik Ligi' },
};

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
});

describe('utworzBaze', () => {
  it('starts with no captured clubs', () => {
    expect(utworzBaze().wpisy).toHaveLength(0);
  });

});

describe('dodajWpis', () => {
  it('stores the seed, the inflected result and the roles', () => {
    const baza = utworzBaze();
    const wpis = baza.dodajWpis(DANE);
    expect(wpis.przymiotnik).toBe('pokretny');
    expect(wpis.wynik).toBe('Liga Pokretnych Zmor');
    expect(wpis.role.przywodca).toBe('Przywodca Ligi');
    expect(wpis.id).toBeTruthy();
    expect(baza.wpisy).toHaveLength(1);
  });

  it('survives a reload', () => {
    utworzBaze().dodajWpis({ ...DANE, wynik: 'Liga Wrednych Kotow' });
    const swieza = utworzBaze();
    expect(swieza.wpisy).toHaveLength(1);
    expect(swieza.wpisy[0].wynik).toBe('Liga Wrednych Kotow');
    expect(swieza.wpisy[0].role.czlonek).toBe('Uczestnik Ligi');
  });
});

describe('oznaczWyslany', () => {
  it('records the wall id so the entry is not offered twice', () => {
    const baza = utworzBaze();
    const wpis = baza.dodajWpis({ ...DANE, wynik: 'Liga Wrednych Kotow' });
    baza.oznaczWyslany(wpis.id, 'zdalne-1');
    expect(utworzBaze().wpisy[0].wyslane).toBe('zdalne-1');
  });

  it('ignores an unknown id', () => {
    const baza = utworzBaze();
    expect(() => baza.oznaczWyslany('nie-ma', 'x')).not.toThrow();
  });
});

describe('wyczysc', () => {
  it('drops every entry, in memory and on disk', () => {
    const baza = utworzBaze();
    baza.dodajWpis(DANE);
    baza.dodajWpis({ ...DANE, wynik: 'Liga Wrednych Kotow' });

    expect(baza.wyczysc()).toBe(2);
    expect(baza.wpisy).toHaveLength(0);
    expect(utworzBaze().wpisy).toHaveLength(0);
  });
});

describe('storage failures', () => {
  it('keeps working in memory when localStorage rejects writes', () => {
    vi.stubGlobal('localStorage', {
      ...makeLocalStorageMock(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    const baza = utworzBaze();
    expect(() => baza.dodajWpis({ ...DANE, wynik: 'Liga Wrednych Kotow' })).not.toThrow();
    expect(baza.wpisy).toHaveLength(1);
  });
});
