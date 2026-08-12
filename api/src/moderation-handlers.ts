import type {
  AkcjaModeracji,
  BladResponse,
  ListaModeracjiResponse,
  ModeracjaResponse,
  PozycjaModeracji,
  RaportResponse,
} from '../../src/shared/rkg-api';
import type { Env } from './env';
import type { CorsHeaders } from './http';
import { errorResponse, json } from './http';
import { zapiszRaport } from './reports';
import { toRankingEntry } from './rows';
import { walidujRaport } from './validate';

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
    return errorResponse('brak dostepu', 403, cors);
  }
  return null;
}

export async function getModeration(req: Request, env: Env, cors: CorsHeaders): Promise<Response> {
  const denied = await authorizeAdmin(req, env, cors);
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
      ...toRankingEntry(row),
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

export async function postModeration(
  id: string,
  req: Request,
  env: Env,
  cors: CorsHeaders,
): Promise<Response> {
  const denied = await authorizeAdmin(req, env, cors);
  if (denied) return denied;
  const body = await req.json().catch(() => null) as { akcja?: unknown } | null;
  const action = body?.akcja;
  if (action !== 'ukryj' && action !== 'przywroc' && action !== 'usun') {
    return errorResponse('zla akcja', 400, cors);
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
  if (changed === 0) return errorResponse('nie ma takiej nazwy', 404, cors);

  const response: ModeracjaResponse = { id, akcja };
  return json(response, 200, cors);
}
