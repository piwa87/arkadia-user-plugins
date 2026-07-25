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

# 2. create the tables (remote + local dev copy)
yarn db:init
yarn db:init:local

# 3. build the site so the Worker has assets to serve
cd ../web && yarn install && yarn build && cd ../api
```

Set `RKG_CORS` in `wrangler.toml` to the Arkadia web client's real origin (plus
`http://localhost:3030` for local plugin dev). Tune `RKG_LIMIT_ZGLOSZEN` /
`RKG_LIMIT_GLOSOW` (per-device hourly caps) if needed.

## Develop locally

```bash
cd api && npx wrangler dev        # serves site + API on http://localhost:8787
```

Point the plugin at it in-game with `rkgwall http://localhost:8787`, then use the
**Wyslij** button in the `rkghof` popup.

## Deploy

```bash
cd web && yarn build && cd ../api && npx wrangler deploy
```

The Worker prints its URL (e.g. `https://rkg-wall.<you>.workers.dev`). Set that as
the plugin's wall with `rkgwall <url>` (or bake it into `DOMYSLNY_WALL` in
`src/plugins/rkg-plugin/hof.ts` before building the plugin). A custom domain can be
attached in the Cloudflare dashboard.

## API

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `POST` | `/api/nazwy` | `ZgloszenieRequest` | `ZgloszenieResponse` (dedupes by normalised name; repeat bumps `zgloszenia`) |
| `GET` | `/api/nazwy?sort=top\|nowe\|losowe&cursor&limit` | — | `ListaResponse` |
| `POST` | `/api/nazwy/:id/glos` | `GlosRequest` (`wartosc` 1/-1/0) | `GlosResponse` |

Types are the single source of truth in [`src/shared/rkg-api.ts`](../src/shared/rkg-api.ts).

### Why the endpoint is hard to abuse

The server stores no free-form display text. Every submission is validated
against the exact word lists and grammar the generator uses (`validate.ts`):
`typ` and `przymiotnik` must be list members; the name must match the strict
"type + 2–3 capitalised words" shape; its adjective must share a stem with the
submitted base adjective; roles/nick are pattern-checked. Anything else → 400.
Per-device hourly rate limits and an `ukryte` takedown flag round it out.
