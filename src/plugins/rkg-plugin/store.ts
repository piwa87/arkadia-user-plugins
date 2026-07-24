import type { WpisLokalny } from '../../shared/rkg-api';
import { storage } from '../../lib/storage';
import { RZECZOWNIKI_SEED } from './data/seed';

/**
 * Local persistence, backed by localStorage.
 *
 * - `wpisy` — the clubs this plugin has generated: the full captured object
 *   (seed answers, the inflected name, and the three leadership titles). This
 *   is the record `rkgshow!` lists and the wall submits from.
 * - `rzeczowniki` — the accepted-noun base the creation dialogue answers from,
 *   seeded from `data/seed.ts` and topped up by `rkgnazwy+ <slowo>`.
 */

const KLUCZ_WPISY = 'rkg:wpisy';
const KLUCZ_RZECZOWNIKI = 'rkg:rzeczowniki';

// localStorage is shared with every other plugin — stay bounded. Oldest go first.
const LIMIT_WPISY = 500;

export interface Baza {
  readonly wpisy: readonly WpisLokalny[];
  readonly rzeczowniki: readonly string[];
  dodajWpis(dane: Omit<WpisLokalny, 'id' | 'kiedy' | 'wyslane'>): WpisLokalny;
  oznaczWyslany(id: string, zdalneId: string): void;
  scalRzeczowniki(slowa: readonly string[]): void;
}

function nowyId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `rkg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * `storage.set` writes straight to localStorage, which throws when the quota is
 * exhausted. A full disk must not take the plugin down mid-run, so persistence
 * is best-effort: the in-memory lists stay correct either way.
 */
function zapisz(klucz: string, wartosc: unknown): void {
  try {
    storage.set(klucz, wartosc);
  } catch {
    /* quota exceeded or storage disabled — keep going with in-memory state */
  }
}

export function utworzBaze(): Baza {
  const wpisy = (storage.get<WpisLokalny[]>(KLUCZ_WPISY) ?? []).filter(
    (w): w is WpisLokalny => !!w && typeof w.wynik === 'string',
  );
  const zapisaneRzecz = storage.get<string[]>(KLUCZ_RZECZOWNIKI);
  const rzeczowniki = Array.isArray(zapisaneRzecz) ? zapisaneRzecz : [...RZECZOWNIKI_SEED];

  return {
    get wpisy() {
      return wpisy;
    },
    get rzeczowniki() {
      return rzeczowniki;
    },

    dodajWpis(dane: Omit<WpisLokalny, 'id' | 'kiedy' | 'wyslane'>): WpisLokalny {
      const wpis: WpisLokalny = { ...dane, id: nowyId(), kiedy: Date.now() };
      wpisy.push(wpis);
      if (wpisy.length > LIMIT_WPISY) wpisy.splice(0, wpisy.length - LIMIT_WPISY);
      zapisz(KLUCZ_WPISY, wpisy);
      return wpis;
    },

    oznaczWyslany(id: string, zdalneId: string): void {
      const wpis = wpisy.find((w) => w.id === id);
      if (!wpis) return;
      wpis.wyslane = zdalneId;
      zapisz(KLUCZ_WPISY, wpisy);
    },

    scalRzeczowniki(slowa: readonly string[]): void {
      let zmiana = false;
      for (const slowo of slowa) {
        const czyste = slowo.trim().toLowerCase();
        if (!czyste || rzeczowniki.includes(czyste)) continue;
        rzeczowniki.push(czyste);
        zmiana = true;
      }
      if (zmiana) zapisz(KLUCZ_RZECZOWNIKI, rzeczowniki);
    },
  };
}
