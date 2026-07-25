import type {
  CzystkaResponse,
  GlosResponse,
  ListaResponse,
  Pozycja,
  Sortowanie,
  ZgloszenieResponse,
} from '../../src/shared/rkg-api';
import { walidujGlos, walidujZgloszenie } from './validate';

/**
 * RKG wall — Cloudflare Worker.
 *
 * Serves the static site (via the ASSETS binding) and the JSON API under
 * `/api/*`, backed by D1. The site calls the API same-origin (no CORS needed),
 * but the Arkadia plugin calls it cross-origin, so `/api/*` sends CORS headers
 * for the allow-listed origins in RKG_CORS and answers preflight.
 */

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Comma-separated origin allowlist for the plugin (cross-origin) calls. */
  RKG_CORS?: string;
  RKG_LIMIT_ZGLOSZEN?: string;
  RKG_LIMIT_GLOSOW?: string;
  /**
   * Admin key for `DELETE /api/nazwy` (the beta wipe). A Worker SECRET, never a
   * var — set it with `wrangler secret put RKG_ADMIN`. Unset means the route is
   * disabled outright, which is the correct state once beta ends.
   */
  RKG_ADMIN?: string;
}

const GODZINA = 3_600_000;
const DZIEN = 86_400_000;
const DOMYSLNY_LIMIT_ZGLOSZEN = 30;
const DOMYSLNY_LIMIT_GLOSOW = 300;

// ── CORS ──────────────────────────────────────────────────────────────────

function naglowkiCors(req: Request, env: Env): Record<string, string> {
  const dozwolone = (env.RKG_CORS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.get('Origin') ?? '';
  const h: Record<string, string> = { Vary: 'Origin' };
  if (origin && dozwolone.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET,POST,DELETE,OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type,X-RKG-Admin';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}

const blad = (msg: string, status: number, cors: Record<string, string>) =>
  json({ blad: msg }, status, cors);

// ── Rate limiting (per-device, sliding hour) ───────────────────────────────

async function przekroczonyLimit(
  env: Env,
  glosujacy: string,
  rodzaj: string,
  limit: number,
): Promise<boolean> {
  const teraz = Date.now();
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM zdarzenia WHERE glosujacy = ? AND rodzaj = ? AND kiedy > ?',
  )
    .bind(glosujacy, rodzaj, teraz - GODZINA)
    .first<{ n: number }>();
  if ((row?.n ?? 0) >= limit) return true;
  await env.DB.prepare('INSERT INTO zdarzenia (glosujacy, rodzaj, kiedy) VALUES (?, ?, ?)')
    .bind(glosujacy, rodzaj, teraz)
    .run();
  // Opportunistic prune so the table stays small.
  if (Math.random() < 0.02) {
    await env.DB.prepare('DELETE FROM zdarzenia WHERE kiedy < ?').bind(teraz - DZIEN).run();
  }
  return false;
}

// ── Routes ─────────────────────────────────────────────────────────────────

function nowyId(): string {
  return crypto.randomUUID();
}

function doPozycji(r: Record<string, unknown>): Pozycja {
  const role =
    r.rola_przywodca || r.rola_zastepca || r.rola_czlonek
      ? {
          przywodca: (r.rola_przywodca as string) ?? '',
          zastepca: (r.rola_zastepca as string) ?? '',
          czlonek: (r.rola_czlonek as string) ?? '',
        }
      : undefined;
  return {
    id: r.id as string,
    wynik: r.wynik as string,
    role,
    wynikGlosow: (r.wynik_glosow as number) ?? 0,
    zgloszenia: (r.zgloszenia as number) ?? 1,
    nick: (r.nick as string) ?? undefined,
    kiedy: (r.kiedy as number) ?? 0,
  };
}

async function postZgloszenie(req: Request, env: Env, cors: Record<string, string>) {
  const body = await req.json().catch(() => null);
  const v = walidujZgloszenie(body);
  if (!v.ok) return blad(v.blad, 400, cors);
  const d = v.dane;

  const limit = Number(env.RKG_LIMIT_ZGLOSZEN) || DOMYSLNY_LIMIT_ZGLOSZEN;
  if (await przekroczonyLimit(env, d.glosujacy, 'zgloszenie', limit)) {
    return blad('za duzo zgloszen, sprobuj pozniej', 429, cors);
  }

  const istnieje = await env.DB.prepare('SELECT id, zgloszenia FROM nazwy WHERE klucz = ?')
    .bind(d.klucz)
    .first<{ id: string; zgloszenia: number }>();

  if (istnieje) {
    const zgloszenia = istnieje.zgloszenia + 1;
    await env.DB.prepare('UPDATE nazwy SET zgloszenia = ? WHERE id = ?')
      .bind(zgloszenia, istnieje.id)
      .run();
    const res: ZgloszenieResponse = { id: istnieje.id, wynik: d.wynik, zgloszenia, duplikat: true };
    return json(res, 200, cors);
  }

  const id = nowyId();
  await env.DB.prepare(
    `INSERT INTO nazwy
       (id, klucz, wynik, typ, przymiotnik, rzeczownik, liczba, przypadek,
        rola_przywodca, rola_zastepca, rola_czlonek, nick, kiedy)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      id,
      d.klucz,
      d.wynik,
      d.typ,
      d.przymiotnik,
      d.rzeczownik,
      d.liczba,
      d.przypadek,
      d.role?.przywodca ?? null,
      d.role?.zastepca ?? null,
      d.role?.czlonek ?? null,
      d.nick ?? null,
      Date.now(),
    )
    .run();

  const res: ZgloszenieResponse = { id, wynik: d.wynik, zgloszenia: 1, duplikat: false };
  return json(res, 201, cors);
}

async function getLista(url: URL, env: Env, cors: Record<string, string>) {
  const sort = (url.searchParams.get('sort') ?? 'top') as Sortowanie;
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 25, 1), 50);
  const offset = Math.max(Number(url.searchParams.get('cursor')) || 0, 0);

  const orderBy =
    sort === 'nowe'
      ? 'kiedy DESC'
      : sort === 'losowe'
        ? 'RANDOM()'
        : 'wynik_glosow DESC, kiedy DESC';

  const { results } = await env.DB.prepare(
    `SELECT * FROM nazwy WHERE ukryte = 0 ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
  )
    .bind(limit + 1, offset)
    .all<Record<string, unknown>>();

  const rows = results ?? [];
  const jestWiecej = sort !== 'losowe' && rows.length > limit;
  const pozycje = rows.slice(0, limit).map(doPozycji);
  const res: ListaResponse = {
    pozycje,
    cursor: jestWiecej ? String(offset + limit) : undefined,
  };
  return json(res, 200, cors);
}

async function postGlos(id: string, req: Request, env: Env, cors: Record<string, string>) {
  const body = await req.json().catch(() => null);
  const v = walidujGlos(body);
  if (!v.ok) return blad(v.blad, 400, cors);
  const { glosujacy, wartosc } = v.dane;

  const nazwa = await env.DB.prepare('SELECT id FROM nazwy WHERE id = ? AND ukryte = 0')
    .bind(id)
    .first<{ id: string }>();
  if (!nazwa) return blad('nie ma takiej nazwy', 404, cors);

  const limit = Number(env.RKG_LIMIT_GLOSOW) || DOMYSLNY_LIMIT_GLOSOW;
  if (await przekroczonyLimit(env, glosujacy, 'glos', limit)) {
    return blad('za duzo glosow, sprobuj pozniej', 429, cors);
  }

  if (wartosc === 0) {
    await env.DB.prepare('DELETE FROM glosy WHERE nazwa_id = ? AND glosujacy = ?')
      .bind(id, glosujacy)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO glosy (nazwa_id, glosujacy, wartosc, kiedy) VALUES (?,?,?,?)
       ON CONFLICT (nazwa_id, glosujacy) DO UPDATE SET wartosc = excluded.wartosc, kiedy = excluded.kiedy`,
    )
      .bind(id, glosujacy, wartosc, Date.now())
      .run();
  }

  const suma = await env.DB.prepare(
    'SELECT COALESCE(SUM(wartosc), 0) AS s FROM glosy WHERE nazwa_id = ?',
  )
    .bind(id)
    .first<{ s: number }>();
  const wynikGlosow = suma?.s ?? 0;
  await env.DB.prepare('UPDATE nazwy SET wynik_glosow = ? WHERE id = ?').bind(wynikGlosow, id).run();

  const res: GlosResponse = { id, wynikGlosow };
  return json(res, 200, cors);
}

/**
 * `DELETE /api/nazwy` — wipe the wall, keep the schema. Beta escape hatch for
 * the one person running this; there is no undo and no soft-delete.
 *
 * Auth is a single shared key in the `X-RKG-Admin` header, compared against the
 * `RKG_ADMIN` secret. No secret configured → 404, so the route is invisible
 * (and unusable) on a deployment that has not opted in.
 */
async function deleteWszystko(req: Request, env: Env, cors: Record<string, string>) {
  const klucz = env.RKG_ADMIN;
  if (!klucz) return blad('nie znaleziono', 404, cors);
  if (!bezpiecznyRowny(req.headers.get('X-RKG-Admin') ?? '', klucz)) {
    return blad('brak dostepu', 403, cors);
  }

  // Children first — glosy/zdarzenia are meaningless without their names.
  const glosy = await env.DB.prepare('DELETE FROM glosy').run();
  const zdarzenia = await env.DB.prepare('DELETE FROM zdarzenia').run();
  const nazwy = await env.DB.prepare('DELETE FROM nazwy').run();

  const res: CzystkaResponse = {
    nazwy: nazwy.meta.changes ?? 0,
    glosy: glosy.meta.changes ?? 0,
    zdarzenia: zdarzenia.meta.changes ?? 0,
  };
  return json(res, 200, cors);
}

/** Length-independent, early-exit-free comparison — no timing oracle on the key. */
function bezpiecznyRowny(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let rozne = 0;
  for (let i = 0; i < a.length; i++) rozne |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return rozne === 0;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Non-API paths are the static site.
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);

    const cors = naglowkiCors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === '/api/nazwy') {
        if (req.method === 'GET') return await getLista(url, env, cors);
        if (req.method === 'POST') return await postZgloszenie(req, env, cors);
        if (req.method === 'DELETE') return await deleteWszystko(req, env, cors);
      }
      const m = url.pathname.match(/^\/api\/nazwy\/([A-Za-z0-9-]{8,64})\/glos$/);
      if (m && req.method === 'POST') return await postGlos(m[1], req, env, cors);

      return blad('nie znaleziono', 404, cors);
    } catch (e) {
      return blad(`blad serwera: ${String(e)}`, 500, cors);
    }
  },
};
