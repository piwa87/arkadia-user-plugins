import type { HealthResponse } from '../../src/shared/rkg-api';
import type { Env } from './env';
import type { CorsHeaders } from './http';
import { json } from './http';

/** A real D1 query makes the endpoint useful as a post-deploy smoke check. */
export async function getHealth(env: Env, cors: CorsHeaders): Promise<Response> {
  const result = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
  if (result?.ok !== 1) throw new Error('D1 health check failed');

  const response: HealthResponse = { status: 'ok', database: 'ok' };
  return json(response, 200, cors);
}
