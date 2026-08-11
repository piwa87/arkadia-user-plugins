/**
 * Contract shared by the RKG plugin, the wall API (`api/`) and the wall site
 * (`web/`). Keeping it in one file is what stops the payload shape from
 * drifting between the three — the plugin bundles it via esbuild, the other two
 * import it directly.
 *
 * Field names are Polish to match the plugin's user-facing vocabulary and the
 * game's own dialogue wording.
 */

export const LICZBY = ['pojedynczej', 'mnogiej'] as const;
export const PRZYPADKI = ['mianowniku', 'dopelniaczu'] as const;

export type Liczba = (typeof LICZBY)[number];
export type Przypadek = (typeof PRZYPADKI)[number];

/**
 * The answers the plugin fed into the club-creation dialogue.
 *
 * This is deliberately kept next to the final name: the game inflects the
 * adjective and noun according to `liczba`/`przypadek` (base `pokretny` comes
 * back as `Liga Pokretnych Zmor`), so the printed result alone cannot be
 * checked against the word lists. The server validates the seed against the
 * lists and the result against the seed — see `api/walidacja.ts`.
 */
export interface Ziarno {
  /** Organisation type — must be a member of RKG_TYPY. */
  typ: string;
  /** Adjective in base form — must be a member of RKG_PRZYMIOTNIKI. */
  przymiotnik: string;
  /** Noun, harvested from the game's own category menus. */
  rzeczownik: string;
  liczba: Liczba;
  przypadek: Przypadek;
}

/**
 * The three leadership titles the game builds for a club. Each is harvested
 * from the game's summary — the base options differ from one club type to the
 * next, so they cannot be a static list. Example for `Loza Maluskich Korbaczy`:
 * `Przywodca Lozy Maluskich Korbaczy`, `Zaufany w Lozy Maluskich Korbaczy`,
 * `Uczestnik Lozy Maluskich Korbaczy`.
 */
export interface Role {
  /** Boss title. */
  przywodca: string;
  /** Vice-boss title. */
  zastepca: string;
  /** Rank-and-file member title. */
  czlonek: string;
}

/** A generated club as stored locally by the plugin — the full captured object. */
export interface WpisLokalny extends Ziarno {
  /** Local id (uuid) — unrelated to the wall's id. */
  id: string;
  /** The inflected name the game actually printed. */
  wynik: string;
  /** `jawny` / `niejawny`. */
  charakter: string;
  /** `dowolnej` / `meskiej`. */
  plec: string;
  /** The three harvested leadership titles. */
  role: Role;
  /** Epoch ms. */
  kiedy: number;
  /** Wall id, set once the entry has been shared. */
  wyslane?: string;
}

/** A row on the wall, as returned by the API. */
export interface Pozycja {
  id: string;
  wynik: string;
  /** The three leadership titles, when the submitter sent them. */
  role?: Role;
  /** Sum of votes. */
  wynikGlosow: number;
  /** Net votes from the last seven days; present for the "gorace" board. */
  wynikOkresu?: number;
  /** How many people independently generated this same name. */
  zgloszenia: number;
  /** Optional display nick; absent means anonymous. */
  nick?: string;
  kiedy: number;
}

export type Sortowanie = 'gorace' | 'top' | 'nowe' | 'losowe';

export const POWODY_RAPORTU = ['wulgarne', 'osoba', 'inne'] as const;
export type PowodRaportu = (typeof POWODY_RAPORTU)[number];

// ── Requests ────────────────────────────────────────────────────────────────

export interface ZgloszenieRequest extends Ziarno {
  /** The inflected name the game printed. */
  wynik: string;
  /** The three leadership titles — optional, shown on the wall for fun. */
  role?: Role;
  /** Optional display nick. */
  nick?: string;
  /** Stable random per-device id, also used as the vote key. */
  glosujacy: string;
}

export interface ZgloszenieResponse {
  id: string;
  wynik: string;
  zgloszenia: number;
  /** True when this name was already on the wall and we bumped its count. */
  duplikat: boolean;
  /** The newly consumed daily slot. Optional for compatibility with old Workers. */
  limit?: StatusLimitu;
}

export interface ListaResponse {
  pozycje: Pozycja[];
  /** Opaque cursor for the next page; absent when there is no more. */
  cursor?: string;
}

export interface GlosRequest {
  glosujacy: string;
  /** 1 up, -1 down, 0 withdraws an existing vote. */
  wartosc: 1 | -1 | 0;
}

export interface GlosResponse {
  id: string;
  wynikGlosow: number;
}

export interface BladResponse {
  blad: string;
  /** Present on quota errors so clients do not have to parse Polish prose. */
  limit?: StatusLimitu;
  /** Safe identifier that can be matched to a server-side error log. */
  requestId?: string;
  /** Generic structured retry hint for report/vote throttles. */
  ponownieZaMs?: number;
}

export interface StatusLimitu {
  dostepny: boolean;
  /** Milliseconds until a slot is available; zero means it is ready now. */
  ponownieZaMs: number;
}

export interface StatusLimituRequest {
  glosujacy: string;
}

export interface RaportRequest {
  glosujacy: string;
  powod: PowodRaportu;
}

export interface RaportResponse {
  id: string;
  przyjete: true;
  /** True when this installation had already reported the club. */
  duplikat: boolean;
}

export interface PozycjaModeracji extends Pozycja {
  ukryte: boolean;
  raporty: number;
  raportyPowody: Record<PowodRaportu, number>;
}

export interface ListaModeracjiResponse {
  pozycje: PozycjaModeracji[];
}

export type AkcjaModeracji = 'ukryj' | 'przywroc' | 'usun';

export interface ModeracjaRequest {
  akcja: AkcjaModeracji;
}

export interface ModeracjaResponse {
  id: string;
  akcja: AkcjaModeracji;
}
