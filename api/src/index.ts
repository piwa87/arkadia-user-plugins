import type {
  AkcjaModeracji,
  BladResponse,
  GlosResponse,
  ListaModeracjiResponse,
  ListaResponse,
  ModeracjaResponse,
  Pozycja,
  PozycjaModeracji,
  RaportResponse,
  Sortowanie,
  StatusLimitu,
  ZgloszenieResponse,
} from '../../src/shared/rkg-api';
import { walidujGlos, walidujGlosujacego, walidujRaport, walidujZgloszenie } from './validate';
import { formatujCzekanie, sprawdzLimit, zuzyjLimit } from './quota';
import { zapiszRaport } from './reports';
import { DZIEN, zapiszZgloszenie } from './submissions';

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
  RKG_LIMIT_GLOSOW?: string;
  /**
   * Admin key for per-club moderation. A Worker SECRET, never a var — set it
   * with `wrangler secret put RKG_ADMIN`. Unset disables admin routes outright.
   */
  RKG_ADMIN?: string;
}

const GODZINA = 3_600_000;
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
    h['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS';
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

const statusLimitu = (dozwolony: boolean, ponowZaMs: number): StatusLimitu => ({
  dostepny: dozwolony,
  ponownieZaMs: ponowZaMs,
});

// Submissions use a rolling 24-hour window; votes keep their hourly window.

// ── Rate limiting (per-device, sliding windows) ────────────────────────────

// ── Routes ─────────────────────────────────────────────────────────────────

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
    wynikOkresu: r.wynik_okresu == null ? undefined : (r.wynik_okresu as number),
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

  const wynik = await zapiszZgloszenie(env.DB, d);
  if (!wynik.zapisany) {
    const limit = statusLimitu(wynik.limit.dozwolony, wynik.limit.ponowZaMs);
    const body: BladResponse = {
      blad: `limit: jeden klub na 24 godziny; kolejny mozesz wyslac za ${formatujCzekanie(limit.ponownieZaMs)}`,
      limit,
    };
    return json(body, 429, cors);
  }

  const res: ZgloszenieResponse = {
    id: wynik.id,
    wynik: d.wynik,
    zgloszenia: wynik.zgloszenia,
    duplikat: wynik.duplikat,
    limit: statusLimitu(false, DZIEN),
  };
  return json(res, wynik.duplikat ? 200 : 201, cors);
}

async function postStatusLimitu(req: Request, env: Env, cors: Record<string, string>) {
  const body = await req.json().catch(() => null);
  const v = walidujGlosujacego(body);
  if (!v.ok) return blad(v.blad, 400, cors);
  const limit = await sprawdzLimit(env.DB, v.dane.glosujacy, 'zgloszenie', 1, DZIEN);
  return json(statusLimitu(limit.dozwolony, limit.ponowZaMs), 200, cors);
}

async function getLista(url: URL, env: Env, cors: Record<string, string>) {
  const requested = url.searchParams.get('sort') ?? 'gorace';
  const sort: Sortowanie = ['gorace', 'top', 'nowe', 'losowe'].includes(requested)
    ? requested as Sortowanie
    : 'gorace';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 25, 1), 50);
  const offset = Math.max(Number(url.searchParams.get('cursor')) || 0, 0);

  let query: D1PreparedStatement;
  if (sort === 'gorace') {
    query = env.DB.prepare(
      `SELECT n.*,
         COALESCE((SELECT SUM(g.wartosc) FROM glosy g
                   WHERE g.nazwa_id = n.id AND g.kiedy > ?), 0) AS wynik_okresu
       FROM nazwy n WHERE n.ukryte = 0
       ORDER BY wynik_okresu DESC, n.kiedy DESC LIMIT ? OFFSET ?`,
    ).bind(Date.now() - 7 * DZIEN, limit + 1, offset);
  } else {
    const orderBy = sort === 'nowe'
      ? 'kiedy DESC'
      : sort === 'losowe'
        ? 'RANDOM()'
        : 'wynik_glosow DESC, kiedy DESC';
    query = env.DB.prepare(
      `SELECT * FROM nazwy WHERE ukryte = 0 ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    ).bind(limit + 1, offset);
  }
  const { results } = await query.all<Record<string, unknown>>();

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
  const quota = await zuzyjLimit(env.DB, glosujacy, 'glos', limit, GODZINA);
  if (!quota.dozwolony) {
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

async function postRaport(id: string, req: Request, env: Env, cors: Record<string, string>) {
  const body = await req.json().catch(() => null);
  const v = walidujRaport(body);
  if (!v.ok) return blad(v.blad, 400, cors);
  const wynik = await zapiszRaport(env.DB, id, v.dane.glosujacy, v.dane.powod);
  if (wynik.status === 'nie_ma') return blad('nie ma takiej nazwy', 404, cors);
  if (wynik.status === 'limit') {
    const body: BladResponse = {
      blad: 'za duzo zgloszen, sprobuj pozniej',
      ponownieZaMs: wynik.ponownieZaMs,
    };
    return json(body, 429, cors);
  }
  const response: RaportResponse = {
    id,
    przyjete: true,
    duplikat: wynik.status === 'duplikat',
  };
  return json(response, wynik.status === 'duplikat' ? 200 : 201, cors);
}

function autoryzujAdmin(req: Request, env: Env, cors: Record<string, string>): Response | null {
  const klucz = env.RKG_ADMIN;
  if (!klucz) return blad('nie znaleziono', 404, cors);
  if (!bezpiecznyRowny(req.headers.get('X-RKG-Admin') ?? '', klucz)) {
    return blad('brak dostepu', 403, cors);
  }
  return null;
}

async function getModeracja(req: Request, env: Env, cors: Record<string, string>) {
  const denied = autoryzujAdmin(req, env, cors);
  if (denied) return denied;
  const { results } = await env.DB.prepare(
    `SELECT n.*, COUNT(r.nazwa_id) AS raporty,
       SUM(CASE WHEN r.powod = 'wulgarne' THEN 1 ELSE 0 END) AS raporty_wulgarne,
       SUM(CASE WHEN r.powod = 'osoba' THEN 1 ELSE 0 END) AS raporty_osoba,
       SUM(CASE WHEN r.powod = 'inne' THEN 1 ELSE 0 END) AS raporty_inne
     FROM nazwy n LEFT JOIN raporty r ON r.nazwa_id = n.id
     GROUP BY n.id
     ORDER BY n.ukryte DESC, raporty DESC, n.kiedy DESC
     LIMIT 200`,
  ).all<Record<string, unknown>>();
  const response: ListaModeracjiResponse = {
    pozycje: (results ?? []).map((row): PozycjaModeracji => ({
      ...doPozycji(row),
      ukryte: Boolean(row.ukryte),
      raporty: (row.raporty as number) ?? 0,
      raportyPowody: {
        wulgarne: (row.raporty_wulgarne as number) ?? 0,
        osoba: (row.raporty_osoba as number) ?? 0,
        inne: (row.raporty_inne as number) ?? 0,
      },
    })),
  };
  return json(response, 200, cors);
}

async function postModeracja(
  id: string,
  req: Request,
  env: Env,
  cors: Record<string, string>,
) {
  const denied = autoryzujAdmin(req, env, cors);
  if (denied) return denied;
  const body = await req.json().catch(() => null) as { akcja?: unknown } | null;
  const action = body?.akcja;
  if (action !== 'ukryj' && action !== 'przywroc' && action !== 'usun') {
    return blad('zla akcja', 400, cors);
  }
  const akcja: AkcjaModeracji = action;
  let changed = 0;
  if (akcja === 'usun') {
    const [, , name] = await env.DB.batch([
      env.DB.prepare('DELETE FROM glosy WHERE nazwa_id = ?').bind(id),
      env.DB.prepare('DELETE FROM raporty WHERE nazwa_id = ?').bind(id),
      env.DB.prepare('DELETE FROM nazwy WHERE id = ?').bind(id),
    ]);
    changed = name.meta.changes ?? 0;
  } else {
    const result = await env.DB.prepare('UPDATE nazwy SET ukryte = ? WHERE id = ?')
      .bind(akcja === 'ukryj' ? 1 : 0, id)
      .run();
    changed = result.meta.changes ?? 0;
  }
  if (changed === 0) return blad('nie ma takiej nazwy', 404, cors);
  const response: ModeracjaResponse = { id, akcja };
  return json(response, 200, cors);
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
      }
      if (url.pathname === '/api/limit' && req.method === 'POST') {
        return await postStatusLimitu(req, env, cors);
      }
      const m = url.pathname.match(/^\/api\/nazwy\/([A-Za-z0-9-]{8,64})\/glos$/);
      if (m && req.method === 'POST') return await postGlos(m[1], req, env, cors);
      const report = url.pathname.match(/^\/api\/nazwy\/([A-Za-z0-9-]{8,64})\/raport$/);
      if (report && req.method === 'POST') return await postRaport(report[1], req, env, cors);
      if (url.pathname === '/api/admin/nazwy' && req.method === 'GET') {
        return await getModeracja(req, env, cors);
      }
      const moderation = url.pathname.match(/^\/api\/admin\/nazwy\/([A-Za-z0-9-]{8,64})$/);
      if (moderation && req.method === 'POST') {
        return await postModeracja(moderation[1], req, env, cors);
      }

      return blad('nie znaleziono', 404, cors);
    } catch (e) {
      const requestId = req.headers.get('cf-ray') ?? crypto.randomUUID();
      console.error(`[rkg:${requestId}]`, e);
      const body: BladResponse = { blad: 'blad serwera', requestId };
      return json(body, 500, cors);
    }
  },
};
