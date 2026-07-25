import type { Liczba, Przypadek, Role } from '../../src/shared/rkg-api';
import { LICZBY, PRZYPADKI } from '../../src/shared/rkg-api';
import {
  WZORZEC_NICKA,
  WZORZEC_RZECZOWNIKA,
  normalizuj,
  pasujeRdzen,
  wzorzecNazwy,
} from '../../src/shared/rkg-grammar';
import { RKG_TYPY } from '../../src/plugins/rkg-plugin/data/types';
import { RKG_PRZYMIOTNIKI } from '../../src/plugins/rkg-plugin/data/adjectives';

/**
 * Server-side validation for the wall.
 *
 * The endpoint stores NO free-form display text. Every field is validated
 * against the very same word lists and grammar helpers the generator uses
 * (imported directly — single source of truth), and the submitted name is
 * reconstructed-checked against the seed. Anything that fails is rejected with
 * a 400; injected text simply has no route into the database.
 */

// Built once at module load.
const TYPY = new Set(RKG_TYPY.map((t) => t.toLowerCase()));
const PRZYMIOTNIKI = new Set(RKG_PRZYMIOTNIKI);
const NAZWA_RE = wzorzecNazwy(RKG_TYPY);
const TYP_ALT = [...RKG_TYPY].sort((a, b) => b.length - a.length);
const ROLA_RE = /^[A-Za-z ]{3,80}$/;
const GLOSUJACY_RE = /^[A-Za-z0-9_-]{8,64}$/;

export interface CzysteZgloszenie {
  typ: string;
  przymiotnik: string;
  rzeczownik: string;
  liczba: Liczba;
  przypadek: Przypadek;
  wynik: string;
  klucz: string;
  role?: Role;
  nick?: string;
  glosujacy: string;
}

export type WynikWalidacji<T> = { ok: true; dane: T } | { ok: false; blad: string };

const isStr = (x: unknown): x is string => typeof x === 'string';

export function walidujZgloszenie(body: unknown): WynikWalidacji<CzysteZgloszenie> {
  if (!body || typeof body !== 'object') return { ok: false, blad: 'brak danych' };
  const b = body as Record<string, unknown>;

  const typ = isStr(b.typ) ? b.typ.trim().toLowerCase() : '';
  if (!TYPY.has(typ)) return { ok: false, blad: 'nieznany typ' };

  const przymiotnik = isStr(b.przymiotnik) ? b.przymiotnik.trim().toLowerCase() : '';
  if (!PRZYMIOTNIKI.has(przymiotnik)) return { ok: false, blad: 'nieznany przymiotnik' };

  const rzeczownik = isStr(b.rzeczownik) ? b.rzeczownik.trim().toLowerCase() : '';
  if (!WZORZEC_RZECZOWNIKA.test(rzeczownik)) return { ok: false, blad: 'zly rzeczownik' };

  const liczba = b.liczba;
  if (!isStr(liczba) || !(LICZBY as readonly string[]).includes(liczba)) {
    return { ok: false, blad: 'zla liczba' };
  }
  const przypadek = b.przypadek;
  if (!isStr(przypadek) || !(PRZYPADKI as readonly string[]).includes(przypadek)) {
    return { ok: false, blad: 'zly przypadek' };
  }

  const wynik = isStr(b.wynik) ? b.wynik.trim().replace(/\s+/g, ' ') : '';
  if (!NAZWA_RE.test(wynik)) return { ok: false, blad: 'zla nazwa' };

  // The name must start with the submitted type, and its first (adjective) word
  // must be an inflection of the submitted base adjective.
  const low = wynik.toLowerCase();
  const t = TYP_ALT.find((x) => low.startsWith(`${x.toLowerCase()} `));
  if (!t || t.toLowerCase() !== typ) return { ok: false, blad: 'typ nie zgadza sie z nazwa' };
  const adjOdmieniony = wynik.slice(t.length + 1).split(' ')[0] ?? '';
  if (!pasujeRdzen(przymiotnik, adjOdmieniony)) {
    return { ok: false, blad: 'przymiotnik nie pasuje do nazwy' };
  }

  // Roles are display-only; sanitise hard, keep only if at least one present.
  let role: Role | undefined;
  if (b.role && typeof b.role === 'object') {
    const r = b.role as Record<string, unknown>;
    const p = isStr(r.przywodca) ? r.przywodca.trim() : '';
    const z = isStr(r.zastepca) ? r.zastepca.trim() : '';
    const c = isStr(r.czlonek) ? r.czlonek.trim() : '';
    if (p || z || c) {
      for (const v of [p, z, c]) {
        if (v && !ROLA_RE.test(v)) return { ok: false, blad: 'zly tytul' };
      }
      role = { przywodca: p, zastepca: z, czlonek: c };
    }
  }

  let nick: string | undefined;
  if (b.nick != null && b.nick !== '') {
    if (!isStr(b.nick) || !WZORZEC_NICKA.test(b.nick.trim())) {
      return { ok: false, blad: 'zly nick' };
    }
    nick = b.nick.trim();
  }

  const glosujacy = isStr(b.glosujacy) ? b.glosujacy.trim() : '';
  if (!GLOSUJACY_RE.test(glosujacy)) return { ok: false, blad: 'zly identyfikator' };

  return {
    ok: true,
    dane: {
      typ,
      przymiotnik,
      rzeczownik,
      liczba: liczba as Liczba,
      przypadek: przypadek as Przypadek,
      wynik,
      klucz: normalizuj(wynik),
      role,
      nick,
      glosujacy,
    },
  };
}

export function walidujGlos(
  body: unknown,
): WynikWalidacji<{ glosujacy: string; wartosc: 1 | -1 | 0 }> {
  if (!body || typeof body !== 'object') return { ok: false, blad: 'brak danych' };
  const b = body as Record<string, unknown>;
  const glosujacy = isStr(b.glosujacy) ? b.glosujacy.trim() : '';
  if (!GLOSUJACY_RE.test(glosujacy)) return { ok: false, blad: 'zly identyfikator' };
  const w = b.wartosc;
  if (w !== 1 && w !== -1 && w !== 0) return { ok: false, blad: 'zla wartosc' };
  return { ok: true, dane: { glosujacy, wartosc: w } };
}
