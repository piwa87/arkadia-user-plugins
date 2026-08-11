import type { WpisLokalny } from '../../shared/rkg-api';
import { storage } from '../../lib/storage';

/**
 * Local persistence, backed by localStorage.
 *
 * `wpisy` — the clubs this plugin has generated: the full captured object (seed
 * answers, the inflected name, and the three leadership titles). This is the
 * record `rkgshow!` lists and the wall submits from. The noun base itself is
 * not stored here — it is fixed in `data/seed.ts`.
 */

const KLUCZ_WPISY = 'rkg:wpisy';

// localStorage is shared with every other plugin — stay bounded. Oldest go first.
const LIMIT_WPISY = 500;

export interface Baza {
  readonly wpisy: readonly WpisLokalny[];
  dodajWpis(dane: Omit<WpisLokalny, 'id' | 'kiedy' | 'wyslane'>): WpisLokalny;
  oznaczWyslany(id: string, zdalneId: string): void;
  /**
   * Drop one club. Refuses (returns false) for a club already on the wall —
   * deleting it locally would only lose the record of what we published.
   */
  usun(id: string): boolean;
  /** Drop every club that was never published. Returns how many went. */
  usunNiewyslane(): number;
  /** Drop every locally captured club. Used by `rkgnuke -`; there is no undo. */
  wyczysc(): number;
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

  return {
    get wpisy() {
      return wpisy;
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

    usun(id: string): boolean {
      const i = wpisy.findIndex((w) => w.id === id);
      if (i < 0 || wpisy[i].wyslane) return false;
      wpisy.splice(i, 1);
      zapisz(KLUCZ_WPISY, wpisy);
      return true;
    },

    usunNiewyslane(): number {
      const zostaja = wpisy.filter((w) => w.wyslane);
      const ile = wpisy.length - zostaja.length;
      if (ile === 0) return 0;
      wpisy.length = 0;
      wpisy.push(...zostaja);
      zapisz(KLUCZ_WPISY, wpisy);
      return ile;
    },

    wyczysc(): number {
      const ile = wpisy.length;
      wpisy.length = 0;
      zapisz(KLUCZ_WPISY, wpisy);
      return ile;
    },
  };
}
