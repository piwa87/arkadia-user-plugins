import type { StatusLimitu } from '../../src/shared/rkg-api';
import type { Env } from './env';

export type CorsHeaders = Record<string, string>;

export function corsHeaders(req: Request, env: Env): CorsHeaders {
  const allowed = (env.RKG_CORS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = req.headers.get('Origin') ?? '';
  const headers: CorsHeaders = { Vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type,X-RKG-Admin';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

export function json(data: unknown, status: number, cors: CorsHeaders): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...cors,
    },
  });
}

export function errorResponse(message: string, status: number, cors: CorsHeaders): Response {
  return json({ blad: message }, status, cors);
}

export function limitStatus(allowed: boolean, retryInMs: number): StatusLimitu {
  return { dostepny: allowed, ponownieZaMs: retryInMs };
}
