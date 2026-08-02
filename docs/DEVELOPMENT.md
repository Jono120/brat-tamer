# Development guide

## Prerequisites

- Node.js 20+ (CI uses Node.js 24).
- A Supabase project (managed PostgreSQL + Auth), **or** local Postgres via Docker Compose / `npm run db:start`. See [SUPABASE.md](SUPABASE.md).

## Quick start

```bash
npm install
cp .env.example .env # fill in values — see Configuration below
npx supabase login
npx supabase link --project-ref <SUPABASE_PROJECT_ID>
npm run db:push
npm run dev # Vite :3000 + API :3001, /api proxied
```

Run client and server separately if you prefer: `npm run dev:client` and `npm run dev:server`.

Production build and serve:

```bash
npm run build
npm start # API + static files from dist/ when present
```

## Configuration

Copy `.env.example` to `.env`. Never commit real secrets.

### API (required)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Supabase: **Supavisor session pooler** on port 5432 (`postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres`). |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` — used by `@supabase/server` for clients and JWKS derivation. |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`) for RLS-scoped clients. |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_...`, server-only). Never expose to the frontend. |
| `FRONTEND_URL` | Comma-separated browser origins for CORS (e.g. `http://localhost:3000`). |
| `ADMIN_EMAILS` | Comma-separated emails granted the `admin` role. |

### API (optional)

| Variable | Purpose |
| --- | --- |
| `PGSSL=disable` | Disable TLS for local Docker Postgres. Leave unset for Supabase. |
| `SUPABASE_JWKS_URL` / `SUPABASE_JWKS` | Override JWKS endpoint or supply inline JSON for JWT verification. |
| `APPLY_SCHEMA=true` | Apply `0001_initial_schema.sql` on startup (local shortcut; prefer `db push`). |
| `PORT` | API port (default `3001`). |
| `CORS_ORIGINS` | Extra allowed CORS origins (comma-separated). |
| `ALLOW_CAPACITOR_ORIGINS` | Set `false` to disable auto-allowing Capacitor WebView origins. |
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase service account for push sends. See [MOBILE_RELEASE.md](MOBILE_RELEASE.md). |

Auth providers (Google / Apple / email) are configured in the Supabase dashboard and `supabase/config.toml`, not in server env. See [SUPABASE.md S2](SUPABASE.md#2-auth-provider-configuration).

### Client (Vite — public by design)

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon/publishable key |
| `VITE_ADMIN_EMAILS` | Admin emails for UI (align with `ADMIN_EMAILS`) |
| `VITE_API_BASE` | **Required for Capacitor.** Full API URL without trailing slash. Omit for same-origin web. |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite + API with file watching |
| `npm run dev:client` | Frontend only |
| `npm run dev:server` | API only |
| `npm run build` | Build client to `dist/` |
| `npm start` | Run API (and static files from `dist/` if present) |
| `npm run lint` | Typecheck with `tsc --noEmit` |
| `npm test` | Tests in watch mode ([Vitest](https://vitest.dev/)) |
| `npm run test:run` | Run tests once (CI) |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run build:cap` | Web build for native (`base: './'`) and `cap sync` |
| `npm run build:cap:staging` | Native build via `.env.capacitor-staging` |
| `npm run build:cap:prod` | Native build via `.env.capacitor-production` |
| `npm run cap:sync` | `cap sync` only |
| `npm run cap:open:android` | Open Android Studio |
| `npm run cap:open:ios` | Open Xcode (macOS) |
| `npm run assets:placeholders` | Regenerate placeholder icon/splash in `assets/` |
| `npm run assets:generate` | Generate native icons & splash ([@capacitor/assets](https://github.com/ionic-team/capacitor-assets)) |
| `npm run db:start` / `db:stop` | Start / stop local Supabase stack (Docker) |
| `npm run db:push` | Apply migrations to linked project |
| `npm run db:reset` | Rebuild local DB from migrations + `seed.sql` |
| `npm run db:migration:new` | Scaffold a new migration |
| `npm run db:diff` | Capture Studio changes into a migration |
| `npm run db:types` | Regenerate `src/types/database.ts` from linked schema |
| `npm run docker:up` | Build and start Docker Compose stack |
| `npm run docker:down` | Stop Compose stack |
| `npm run docker:db` | Postgres container only (for host-side `npm run dev`) |

Supabase CLI scripts are also documented in [SUPABASE.md](SUPABASE.md#cli-scripts).

## Testing

Tests use **Vitest**, **Testing Library**, and **jsdom** for React. Server logic uses a mocked
PostgreSQL ([pg-mem](https://github.com/oguimbal/pg-mem)) with the canonical schema from `supabase/migrations/0001_initial_schema.sql` (`0002` is excluded — pg-mem has no `auth` schema).

| Location | Coverage |
| --- | --- |
| `server/src/mappers.test.ts` | Row → API DTO mappers |
| `server/src/corsConfig.test.ts` | `FRONTEND_URL` / `CORS_ORIGINS` / Capacitor origins |
| `server/src/schema.pgmem.test.ts` | Schema applies in pg-mem; basic `INSERT` flows |
| `server/test/createPgMemPool.ts` | Helper: `pgcrypto` + `gen_random_uuid`, loads `0001` |
| `src/components/ErrorBoundary.test.tsx` | Error boundary UI |
| `src/api/client.test.ts` | Session token, `fetch` + auth headers, 401 sign-out |

Run `npm run test:run` before releases. pg-mem is not identical to production PostgreSQL — validate critical paths against a real Postgres instance in staging.

## Related docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — component map and project layout
- [DEPLOYMENT.md](DEPLOYMENT.md) — production and Docker
- [SUPABASE.md](SUPABASE.md) — Supabase linking, auth, local stack, CI
- [MOBILE_RELEASE.md](MOBILE_RELEASE.md) — native builds and store submission
