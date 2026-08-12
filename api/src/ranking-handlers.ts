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
import { DZIEN_MS, DOMYSLNY_LIMIT_GLOSOW } from './limits';
import { formatujCzekanie, sprawdzLimit } from './quota';
import { toRankingEntry } from './rows';
import { zapiszZgloszenie } from './submissions';
import { walidujGlos, walidujGlosujacego, walidujZgloszenie } from './validate';
import { zapiszGlos } from './votes';

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
    limit: limitStatus(false, DZIEN_MS),
  };
  return json(response, saved.duplikat ? 200 : 201, cors);
}

export async function postLimitStatus(req: Request, env: Env, cors: CorsHeaders): Promise<Response> {
  const body = await req.json().catch(() => null);
  const validated = walidujGlosujacego(body);
  if (!validated.ok) return errorResponse(validated.blad, 400, cors);
  const limit = await sprawdzLimit(env.DB, validated.dane.glosujacy, 'zgloszenie', 1, DZIEN_MS);
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
    ).bind(Date.now() - 7 * DZIEN_MS, limit + 1, offset);
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

  const configuredLimit = Number(env.RKG_LIMIT_GLOSOW);
  const voteLimit = Number.isFinite(configuredLimit) && configuredLimit > 0
    ? Math.floor(configuredLimit)
    : DOMYSLNY_LIMIT_GLOSOW;
  const result = await zapiszGlos(env.DB, id, glosujacy, wartosc, voteLimit);
  if (result.status === 'nie_ma') return errorResponse('nie ma takiej nazwy', 404, cors);
  if (result.status === 'limit') {
    const response: BladResponse = {
      blad: 'za duzo glosow, sprobuj pozniej',
      ponownieZaMs: result.limit.ponowZaMs,
    };
    return json(response, 429, cors);
  }

  const response: GlosResponse = { id, wynikGlosow: result.wynikGlosow };
  return json(response, 200, cors);
}
