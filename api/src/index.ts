import type { BladResponse } from '../../src/shared/rkg-api';
import type { Env } from './env';
import { corsHeaders, json } from './http';
import { logEvent } from './observability';
import { routeApi } from './routes';

/**
 * RKG wall — static ranking plus a same-origin JSON API backed by D1.
 * The Arkadia plugin is the only cross-origin caller, controlled by RKG_CORS.
 */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);

    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      return await routeApi(req, url, env, cors);
    } catch (error) {
      const requestId = req.headers.get('cf-ray') ?? crypto.randomUUID();
      logEvent('request.failed', {
        requestId,
        method: req.method,
        path: url.pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      const body: BladResponse = { blad: 'blad serwera', requestId };
      return json(body, 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;

export type { Env } from './env';
