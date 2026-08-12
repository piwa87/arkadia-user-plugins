import type {
  AkcjaModeracji,
  BladResponse,
  ListaModeracjiResponse,
  ModeracjaResponse,
  PozycjaModeracji,
  RaportResponse,
  WpisHistoriiModeracji,
} from '../../src/shared/rkg-api';
import { AKCJE_MODERACJI } from '../../src/shared/rkg-api';
import type { Env } from './env';
import type { CorsHeaders } from './http';
import { errorResponse, json } from './http';
import { zapiszModeracje } from './moderation-actions';
import { logEvent } from './observability';
import { zapiszRaport } from './reports';
import { toRankingEntry } from './rows';
import { walidujRaport } from './validate';

function jestAkcjaModeracji(value: unknown): value is AkcjaModeracji {
  return typeof value === 'string'
    && (AKCJE_MODERACJI as readonly string[]).includes(value);
}

function akcjaZBazy(value: unknown): AkcjaModeracji {
  if (!jestAkcjaModeracji(value)) throw new Error('unknown moderation action in history');
  return value;
}

export async function postReport(
  id: string,
  req: Request,
  env: Env,
  cors: CorsHeaders,
): Promise<Response> {
  const body = await req.json().catch(() => null);
  const validated = walidujRaport(body);
  if (!validated.ok) return errorResponse(validated.blad, 400, cors);
  const result = await zapiszRaport(env.DB, id, validated.dane.glosujacy, validated.dane.powod);
  if (result.status === 'nie_ma') return errorResponse('nie ma takiej nazwy', 404, cors);
  if (result.status === 'limit') {
    const response: BladResponse = {
      blad: 'za duzo zgloszen, sprobuj pozniej',
      ponownieZaMs: result.ponownieZaMs,
    };
    logEvent('report.rate_limited', { clubId: id, retryInMs: result.ponownieZaMs });
    return json(response, 429, cors);
  }
  const response: RaportResponse = {
    id,
    przyjete: true,
    duplikat: result.status === 'duplikat',
  };
  return json(response, result.status === 'duplikat' ? 200 : 201, cors);
}

async function safeEqual(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual(a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView): boolean;
  };
  return subtle.timingSafeEqual(providedHash, expectedHash);
}

async function authorizeAdmin(
  req: Request,
  env: Env,
  cors: CorsHeaders,
): Promise<Response | null> {
  const key = env.RKG_ADMIN;
  if (!key) return errorResponse('nie znaleziono', 404, cors);
  if (!await safeEqual(req.headers.get('X-RKG-Admin') ?? '', key)) {
    logEvent('moderation.access_denied');
    return errorResponse('brak dostepu', 403, cors);
  }
  return null;
}

export async function getModeration(req: Request, env: Env, cors: CorsHeaders): Promise<Response> {
  const denied = await authorizeAdmin(req, env, cors);
  if (denied) return denied;
  const [namesResult, historyResult] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare(
    `SELECT n.*, COUNT(r.nazwa_id) AS raporty,
       SUM(CASE WHEN r.powod = 'wulgarne' THEN 1 ELSE 0 END) AS raporty_wulgarne,
       SUM(CASE WHEN r.powod = 'osoba' THEN 1 ELSE 0 END) AS raporty_osoba,
       SUM(CASE WHEN r.powod = 'inne' THEN 1 ELSE 0 END) AS raporty_inne
     FROM nazwy n LEFT JOIN raporty r ON r.nazwa_id = n.id
     GROUP BY n.id
     ORDER BY CASE WHEN COUNT(r.nazwa_id) > 0 THEN 0 WHEN n.ukryte = 1 THEN 1 ELSE 2 END,
              raporty DESC, n.kiedy DESC
     LIMIT 200`,
    ),
    env.DB.prepare(
      `SELECT id, nazwa_id, wynik, akcja, raporty, kiedy
       FROM historia_moderacji
       ORDER BY kiedy DESC, rowid DESC
       LIMIT 200`,
    ),
  ]);
  const response: ListaModeracjiResponse = {
    pozycje: (namesResult.results ?? []).map((row): PozycjaModeracji => ({
      ...toRankingEntry(row),
      ukryte: Boolean(row.ukryte),
      raporty: (row.raporty as number) ?? 0,
      raportyPowody: {
        wulgarne: (row.raporty_wulgarne as number) ?? 0,
        osoba: (row.raporty_osoba as number) ?? 0,
        inne: (row.raporty_inne as number) ?? 0,
      },
    })),
    historia: (historyResult.results ?? []).map((row): WpisHistoriiModeracji => ({
      id: String(row.id),
      nazwaId: String(row.nazwa_id),
      wynik: String(row.wynik),
      akcja: akcjaZBazy(row.akcja),
      raporty: Number(row.raporty) || 0,
      kiedy: Number(row.kiedy) || 0,
    })),
  };
  return json(response, 200, cors);
}

export async function postModeration(
  id: string,
  req: Request,
  env: Env,
  cors: CorsHeaders,
): Promise<Response> {
  const denied = await authorizeAdmin(req, env, cors);
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const action = body && typeof body === 'object'
    ? (body as Record<string, unknown>).akcja
    : undefined;
  if (!jestAkcjaModeracji(action)) {
    return errorResponse('zla akcja', 400, cors);
  }

  const akcja: AkcjaModeracji = action;
  if (!await zapiszModeracje(env.DB, id, akcja)) {
    return errorResponse('nie ma takiej nazwy', 404, cors);
  }

  logEvent('moderation.applied', { clubId: id, action: akcja });
  const response: ModeracjaResponse = { id, akcja };
  return json(response, 200, cors);
}
