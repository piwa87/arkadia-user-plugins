# RKG wall — API + site (Cloudflare)

One Cloudflare Worker serves both the public site (`../web`) and the JSON API
under `/api/*`, backed by a D1 (SQLite) database. Because the site and API share
an origin, the site needs no CORS; the Arkadia plugin calls the API cross-origin,
so the Worker sends CORS headers for the origins listed in `RKG_CORS`.

## Layout

```
api/
  src/index.ts      Worker entry, static assets and top-level error handling
  src/routes.ts     API route matching only
  src/*-handlers.ts ranking, voting, reporting and moderation endpoints
  src/http.ts       JSON responses and CORS
  src/worker-configuration.d.ts generated binding types from wrangler.jsonc
  src/validate.ts   request validation — reuses the plugin's word lists + grammar
  migrations/       versioned D1 schema changes (production + local tests)
  schema.sql        final schema for manual, fresh database setup only
  wrangler.jsonc    config (fill in database_id + RKG_CORS)
../web/dist         built static site the Worker serves (build with: cd web && yarn build)
```

Validation and quota helpers are unit-tested from the repo root. `yarn test`
inside `api/` runs the Worker against a real local D1 through Cloudflare's
Workers Vitest integration, including concurrent uploads and transaction
rollback. No production data is touched.

Run `yarn types:bindings` after changing Worker bindings or public variables;
`yarn types:check` verifies that the committed generated declarations are current.

## One-time setup

```bash
cd api
yarn install                       # wrangler + workers types
npx wrangler login

# 1. create the database, then paste the printed database_id into wrangler.jsonc
npx wrangler d1 create rkg-wall

# 2. create/update the tables from versioned migrations
yarn db:migrate

# 3. build the site so the Worker has assets to serve
cd ../web && yarn install && yarn build && cd ../api

# 4. private password for the per-club moderation panel
npx wrangler secret put RKG_ADMIN

# 5. private, random HMAC key for the network-backed daily limit (32+ bytes)
openssl rand -hex 32 | yarn wrangler secret put RKG_LIMIT_SECRET
```

Set `RKG_CORS` in `wrangler.jsonc` to the Arkadia web client's real origin — that
is the origin of the page the plugin runs in, not wherever the plugin `.js` is
hosted. Club submissions are deliberately fixed at one per installation and
one network identity per rolling 24 hours. The network identity is a secret
HMAC of Cloudflare's client address; the raw address is never persisted or
logged. `RKG_LIMIT_GLOSOW` controls the separate per-device hourly vote cap.

For backend work, `yarn test` runs a disposable local D1 and applies all
migrations automatically. `yarn db:migrate:local` is available for manual
`wrangler dev` sessions. For visual frontend work, `cd web && yarn dev` starts
a local site with 10 mock clubs and a mock voting API at
`http://localhost:4173`.

## Moderation

The website footer opens the **Moderejszyn / Backstage** panel. Enter the
`RKG_ADMIN` Worker secret to see every club, report counts and their fixed
reasons. Each club can be hidden, restored or permanently deleted. The key is
kept only in `sessionStorage` for the current browser tab/session.

`RKG_ADMIN` is a Worker **secret**, never a `[vars]` entry. Set it with
`wrangler secret put RKG_ADMIN`. There is deliberately no API or plugin command
that wipes the whole ranking. `reset.sql` remains an operator-only emergency
file and is not exposed as a package script.

## Deploy

```bash
cd web && yarn build
cd ../api && yarn deploy:check && yarn db:migrate && yarn deploy
curl --fail --silent https://rkg.piwa87.workers.dev/api/health
```

Apply remote migrations before deploying code that depends on them. D1 records
which migrations have already run, so later deploys only apply new files.
The health endpoint performs a real D1 query. Workers Logs retain structured
operational events, and 5% tracing keeps database/request diagnostics available
without tracing every request. Neither logs nor traces contain device IDs or the
moderation secret.

The Worker prints its URL (e.g. `https://rkg-wall.<you>.workers.dev`). Put that in
`WALL` in `src/plugins/rkg-plugin/wall-client.ts` and rebuild the plugin. A
custom domain can be attached in the Cloudflare dashboard.

## API

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | Worker + D1 readiness (`{ status: "ok", database: "ok" }`) |
| `POST` | `/api/nazwy` | `ZgloszenieRequest` | `ZgloszenieResponse` (one per installation and network per rolling 24h; dedupes by normalised name; repeat bumps `zgloszenia`) |
| `POST` | `/api/limit` | `{ glosujacy }` | `StatusLimitu` (read-only combined installation/network slot and countdown) |
| `GET` | `/api/nazwy?sort=gorace\|top\|nowe\|losowe&cursor&limit` | — | `ListaResponse`; `gorace` uses net votes from the last 7 days |
| `POST` | `/api/nazwy/:id/glos` | `GlosRequest` (`wartosc` 1/-1/0) | `GlosResponse` |
| `POST` | `/api/nazwy/:id/raport` | `RaportRequest` (one fixed reason) | `RaportResponse`; duplicate-safe, max 10 distinct reports/hour/device |
| `GET` | `/api/admin/nazwy` | header `X-RKG-Admin` | `ListaModeracjiResponse` with the report queue, hidden state, reason counts and permanent action history |
| `POST` | `/api/admin/nazwy/:id` | `ModeracjaRequest`, header `X-RKG-Admin` | Hide, restore, dismiss reports from or delete exactly one club; every action is audited |

Types are the single source of truth in [`src/shared/rkg-api.ts`](../src/shared/rkg-api.ts).

### Why the endpoint is hard to abuse

The server stores no free-form display text. Every submission is validated
against the exact word lists and grammar the generator uses (`validate.ts`):
`typ` and `przymiotnik` must be list members; the name must match the strict
"type + 2–3 capitalised words" shape; its adjective must share a stem with the
submitted base adjective; roles/nick are pattern-checked. Anything else → 400.
A one-club-per-rolling-24-hours installation-and-network quota, a separate
hourly vote limit, fixed-reason reports, a ten-report hourly cap and protected
per-club moderation round it out. Submission, report, vote and moderation
writes are atomic D1 batches, so simultaneous requests cannot share a slot or
leave partial state.
