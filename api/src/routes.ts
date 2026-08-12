import type { Env } from './env';
import type { CorsHeaders } from './http';
import { getHealth } from './health-handlers';
import { errorResponse } from './http';
import { getModeration, postModeration, postReport } from './moderation-handlers';
import { getRanking, postLimitStatus, postSubmission, postVote } from './ranking-handlers';

const CLUB_ACTION = /^\/api\/nazwy\/([A-Za-z0-9-]{8,64})\/(glos|raport)$/;
const MODERATION_ACTION = /^\/api\/admin\/nazwy\/([A-Za-z0-9-]{8,64})$/;

export async function routeApi(
  req: Request,
  url: URL,
  env: Env,
  cors: CorsHeaders,
): Promise<Response> {
  if (url.pathname === '/api/health' && req.method === 'GET') {
    return getHealth(env, cors);
  }
  if (url.pathname === '/api/nazwy') {
    if (req.method === 'GET') return getRanking(url, env, cors);
    if (req.method === 'POST') return postSubmission(req, env, cors);
  }
  if (url.pathname === '/api/limit' && req.method === 'POST') {
    return postLimitStatus(req, env, cors);
  }

  const clubAction = url.pathname.match(CLUB_ACTION);
  if (clubAction && req.method === 'POST') {
    return clubAction[2] === 'glos'
      ? postVote(clubAction[1], req, env, cors)
      : postReport(clubAction[1], req, env, cors);
  }

  if (url.pathname === '/api/admin/nazwy' && req.method === 'GET') {
    return getModeration(req, env, cors);
  }
  const moderationAction = url.pathname.match(MODERATION_ACTION);
  if (moderationAction && req.method === 'POST') {
    return postModeration(moderationAction[1], req, env, cors);
  }

  return errorResponse('nie znaleziono', 404, cors);
}
