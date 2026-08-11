# RKG wall — API + site (Cloudflare)

One Cloudflare Worker serves both the public site (`../web`) and the JSON API
under `/api/*`, backed by a D1 (SQLite) database. Because the site and API share
an origin, the site needs no CORS; the Arkadia plugin calls the API cross-origin,
so the Worker sends CORS headers for the origins listed in `RKG_CORS`.

## Layout

```
api/
  src/index.ts      the Worker (routes, dedupe, voting, rate-limit, CORS, static)
  src/validate.ts   request validation — reuses the plugin's word lists + grammar
  schema.sql        D1 tables
  wrangler.toml     config (fill in database_id + RKG_CORS)
../web/dist         built static site the Worker serves (build with: cd web && yarn build)
```

Validation is unit-tested from the repo root: `test/api/validate.test.ts` (runs
under the normal `yarn test`). The Worker itself needs Cloudflare's runtime, so
it is typechecked/run with wrangler, not the root toolchain.

## One-time setup

```bash
cd api
yarn install                       # wrangler + workers types
npx wrangler login

# 1. create the database, then paste the printed database_id into wrangler.toml
npx wrangler d1 create rkg-wall

# 2. create the tables
yarn db:init

# 3. build the site so the Worker has assets to serve
cd ../web && yarn install && yarn build && cd ../api

# 4. beta only — the key that authorises wiping the wall (see below)
npx wrangler secret put RKG_ADMIN
```

Set `RKG_CORS` in `wrangler.toml` to the Arkadia web client's real origin — that
is the origin of the page the plugin runs in, not wherever the plugin `.js` is
hosted. Club submissions are deliberately fixed at one per device per rolling
24 hours. `RKG_LIMIT_GLOSOW` controls the separate per-device hourly vote cap.

There is no local D1 setup: production uses one remote database and one Worker
deployment. For visual frontend work, `cd web && yarn dev` starts a local site
with 10 mock clubs and a mock voting API at `http://localhost:4173`.

## Wiping the wall (beta)

Two ways, both irreversible:

```bash
cd api && yarn db:reset            # runs reset.sql against the remote D1
```

or in the game client: `rkgnuke <klucz>`, where `<klucz>` is the `RKG_ADMIN`
secret. That calls `DELETE /api/nazwy` and then clears the local list too.
`rkgnuke -` clears only the local list.

`RKG_ADMIN` is a Worker **secret**, never a `[vars]` entry — it must not be in
this repo, and the plugin never stores it (you type it each time). With the
secret unset the DELETE route answers 404, which is where it should be left once
beta is over.

## Deploy

```bash
cd web && yarn build && cd ../api && npx wrangler deploy
```

The Worker prints its URL (e.g. `https://rkg-wall.<you>.workers.dev`). Put that in
`WALL` in `src/plugins/rkg-plugin/hof.ts` and rebuild the plugin. A custom domain
can be attached in the Cloudflare dashboard.

## API

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `POST` | `/api/nazwy` | `ZgloszenieRequest` | `ZgloszenieResponse` (one per device per rolling 24h; dedupes by normalised name; repeat bumps `zgloszenia`) |
| `GET` | `/api/nazwy?sort=top\|nowe\|losowe&cursor&limit` | — | `ListaResponse` |
| `POST` | `/api/nazwy/:id/glos` | `GlosRequest` (`wartosc` 1/-1/0) | `GlosResponse` |
| `DELETE` | `/api/nazwy` | — (header `X-RKG-Admin: <RKG_ADMIN>`) | `CzystkaResponse` — wipes every row; 404 when `RKG_ADMIN` is unset |

Types are the single source of truth in [`src/shared/rkg-api.ts`](../src/shared/rkg-api.ts).

### Why the endpoint is hard to abuse

The server stores no free-form display text. Every submission is validated
against the exact word lists and grammar the generator uses (`validate.ts`):
`typ` and `przymiotnik` must be list members; the name must match the strict
"type + 2–3 capitalised words" shape; its adjective must share a stem with the
submitted base adjective; roles/nick are pattern-checked. Anything else → 400.
A one-club-per-rolling-24-hours device quota, a separate hourly vote limit and
an `ukryte` takedown flag round it out. The submission check and slot claim are
one atomic SQLite statement, so simultaneous requests cannot share a free slot.
