import type {
  BladResponse,
  GlosResponse,
  ListaResponse,
  Sortowanie,
  ZgloszenieResponse,
} from '../../src/shared/rkg-api';
import type { Env } from './env';
import type { CorsHeaders } from './http';
import { errorResponse, json, limitStatus } from './http';
import { formatujCzekanie, sprawdzLimit, zuzyjLimit } from './quota';
import { toRankingEntry } from './rows';
import { DZIEN, zapiszZgloszenie } from './submissions';
import { walidujGlos, walidujGlosujacego, walidujZgloszenie } from './validate';

const HOUR = 3_600_000;
const DEFAULT_VOTE_LIMIT = 300;

export async function postSubmission(req: Request, env: Env, cors: CorsHeaders): Promise<Response> {
  const body = await req.json().catch(() => null);
  const validated = walidujZgloszenie(body);
  if (!validated.ok) return errorResponse(validated.blad, 400, cors);

  const saved = await zapiszZgloszenie(env.DB, validated.dane);
  if (!saved.zapisany) {
    const limit = limitStatus(saved.limit.dozwolony, saved.limit.ponowZaMs);
    const response: BladResponse = {
      blad: `limit: jeden klub na 24 godziny; kolejny mozesz wyslac za ${formatujCzekanie(limit.ponownieZaMs)}`,
      limit,
    };
    return json(response, 429, cors);
  }

  const response: ZgloszenieResponse = {
    id: saved.id,
    wynik: validated.dane.wynik,
    zgloszenia: saved.zgloszenia,
    duplikat: saved.duplikat,
    limit: limitStatus(false, DZIEN),
  };
  return json(response, saved.duplikat ? 200 : 201, cors);
}

export async function postLimitStatus(req: Request, env: Env, cors: CorsHeaders): Promise<Response> {
  const body = await req.json().catch(() => null);
  const validated = walidujGlosujacego(body);
  if (!validated.ok) return errorResponse(validated.blad, 400, cors);
  const limit = await sprawdzLimit(env.DB, validated.dane.glosujacy, 'zgloszenie', 1, DZIEN);
  return json(limitStatus(limit.dozwolony, limit.ponowZaMs), 200, cors);
}

export async function getRanking(url: URL, env: Env, cors: CorsHeaders): Promise<Response> {
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
  const hasMore = sort !== 'losowe' && rows.length > limit;
  const response: ListaResponse = {
    pozycje: rows.slice(0, limit).map(toRankingEntry),
    cursor: hasMore ? String(offset + limit) : undefined,
  };
  return json(response, 200, cors);
}

export async function postVote(
  id: string,
  req: Request,
  env: Env,
  cors: CorsHeaders,
): Promise<Response> {
  const body = await req.json().catch(() => null);
  const validated = walidujGlos(body);
  if (!validated.ok) return errorResponse(validated.blad, 400, cors);
  const { glosujacy, wartosc } = validated.dane;

  const name = await env.DB.prepare('SELECT id FROM nazwy WHERE id = ? AND ukryte = 0')
    .bind(id)
    .first<{ id: string }>();
  if (!name) return errorResponse('nie ma takiej nazwy', 404, cors);

  const voteLimit = Number(env.RKG_LIMIT_GLOSOW) || DEFAULT_VOTE_LIMIT;
  const quota = await zuzyjLimit(env.DB, glosujacy, 'glos', voteLimit, HOUR);
  if (!quota.dozwolony) return errorResponse('za duzo glosow, sprobuj pozniej', 429, cors);

  if (wartosc === 0) {
    await env.DB.prepare('DELETE FROM glosy WHERE nazwa_id = ? AND glosujacy = ?')
      .bind(id, glosujacy)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO glosy (nazwa_id, glosujacy, wartosc, kiedy) VALUES (?,?,?,?)
       ON CONFLICT (nazwa_id, glosujacy) DO UPDATE SET wartosc = excluded.wartosc, kiedy = excluded.kiedy`,
    ).bind(id, glosujacy, wartosc, Date.now()).run();
  }

  const sum = await env.DB.prepare(
    'SELECT COALESCE(SUM(wartosc), 0) AS s FROM glosy WHERE nazwa_id = ?',
  ).bind(id).first<{ s: number }>();
  const wynikGlosow = sum?.s ?? 0;
  await env.DB.prepare('UPDATE nazwy SET wynik_glosow = ? WHERE id = ?')
    .bind(wynikGlosow, id)
    .run();

  const response: GlosResponse = { id, wynikGlosow };
  return json(response, 200, cors);
}
