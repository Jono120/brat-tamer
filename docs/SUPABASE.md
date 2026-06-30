# Supabase guide

CareStickers uses **Supabase** for managed Postgres and **Supabase Auth (GoTrue)** as the source
of truth for identity. The Express API keeps all data endpoints and now verifies Supabase access
tokens instead of minting its own JWTs.

- Schema source of truth: `supabase/migrations/0001_initial_schema.sql` (app tables) and
  `supabase/migrations/0002_auth_link.sql` (links `public.users` to `auth.users`).
- CLI config: `supabase/config.toml`. Seed data: `supabase/seed.sql`.
- CLI is pinned as a dev dependency (`supabase` in `package.json`); invoke via `npx supabase`
  or the `db:*` npm scripts.

## CLI scripts

| Script                     | Runs                                                | Purpose                                        |
| -------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| `npm run supabase`         | `supabase`                                          | Raw CLI entry (pass any args)                  |
| `npm run db:start`         | `supabase start`                                    | Start the full local Supabase stack (Docker)   |
| `npm run db:stop`          | `supabase stop`                                     | Stop the local stack                           |
| `npm run db:migration:new` | `supabase migration new <name>`                     | Scaffold a new timestamped migration           |
| `npm run db:push`          | `supabase db push`                                  | Apply migrations to the linked project         |
| `npm run db:reset`         | `supabase db reset`                                 | Rebuild the local DB from migrations + seed    |
| `npm run db:diff`          | `supabase db diff -f <name>`                        | Capture Studio/manual changes into a migration |
| `npm run db:types`         | `supabase gen types typescript --linked > src/types/database.ts` | Regenerate DB types               |

## 1. Link the repo to the hosted project

The project ref (`SUPABASE_PROJECT_ID`) is provided by you (the project owner). Store the access
token and DB password as secrets (local `.env` / CI secrets); never commit them.

```bash
# One-time auth (opens a browser, or use SUPABASE_ACCESS_TOKEN)
npx supabase login

# Link this repo to the hosted project
npx supabase link --project-ref <SUPABASE_PROJECT_ID>
# You will be prompted for the database password (or set SUPABASE_DB_PASSWORD).
```

After linking, apply the schema:

```bash
npm run db:push        # applies 0001 + 0002 to the linked project
```

Then regenerate and commit types:

```bash
npm run db:types
git add src/types/database.ts
```

## 2. Auth provider configuration

Providers are declared in `supabase/config.toml` for local parity and configured in the
dashboard (Auth > Providers / URL Configuration) for the hosted project.

- **Google**: reuse the existing OAuth client. Add Supabase's callback to the Google console
  authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`. Set
  `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` for local.
- **Apple**: configure Services ID, Team ID, Key ID and the `.p8` key in the dashboard (Supabase
  generates the client secret). For local sign-in, `SUPABASE_AUTH_EXTERNAL_APPLE_*` hold the
  Services ID and a pre-generated client-secret JWT.
- **Email**: email/password and magic link are enabled. Configure SMTP for production
  (`[auth.email.smtp]`); locally, emails are captured by the built-in mail UI (Inbucket).
- **Redirect / deep-link URLs**: `additional_redirect_urls` in `config.toml` and the dashboard
  allow-list include the web origins plus the Capacitor scheme
  (`com.carestickers.app://auth-callback`). Update these to match your deployed origins.

### Identity mapping

`0002_auth_link.sql` keys `public.users.id` to `auth.users.id` and adds a `handle_new_user`
trigger that creates the profile row on sign-up (email/password, magic link, Google, Apple). The
server's `userId` (JWT `sub`) therefore equals `public.users.id`, so every existing query keeps
working unchanged. Admin status is derived at request time from `ADMIN_EMAILS`.

### Capacitor / native deep links

Configure the native redirect URL (custom scheme / universal link) in Supabase Auth and pass it
via `signInWithOAuth({ options: { redirectTo } })`. On native, Apple Sign-In may use the Capacitor
Apple plugin feeding `signInWithIdToken`; document the chosen path when implementing native builds.

## 3. Local development

Two valid paths (see also the root `README.md` Docker section):

- **Option A — Docker Postgres only (least churn).** Keep `docker-compose.yml`'s `db` service for
  offline dev. It applies `supabase/migrations/0001_initial_schema.sql` on first volume init. Note
  this plain Postgres has **no `auth` schema**, so `0002_auth_link.sql` is not applied and Supabase
  Auth is unavailable locally; point `VITE_SUPABASE_URL` at the hosted/staging project for auth.
  Set `PGSSL=disable` for the local connection.
- **Option B — Full local Supabase stack.** Run `npm run db:start` (`supabase start`) to bring up
  Postgres, Studio, GoTrue Auth, Storage, Realtime, the Edge runtime and the local mail UI in
  Docker. This gives full Auth parity locally. `npm run db:reset` rebuilds the DB from migrations +
  `seed.sql`. Use Studio for inspection; capture any Studio/manual changes with `npm run db:diff`.

Recommended: Option A short-term to minimise churn; Option B for contributors who want Studio /
Auth / Realtime parity.

## 4. Branching / preview environments

Use Supabase **branching** (or a dedicated staging project) so PRs get an isolated database.
`supabase db push` targets the branch/preview; merging promotes migrations to production. Pick the
model based on your plan tier and document it here once chosen.

## 5. CI/CD

`.github/workflows/supabase.yml`:

- On PRs touching `supabase/**` or the generated types: lint migrations and fail if
  `src/types/database.ts` is stale (drift guard).
- On merge to `main`: `supabase link` + `supabase db push` apply migrations to the linked project.

Required repo secrets (GitHub → Settings → Secrets and variables → Actions):

| Secret | Where to get it | Format |
| ------ | --------------- | ------ |
| `SUPABASE_ACCESS_TOKEN` | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) — click **Generate new token** | `sbp_` + 40 hex chars |
| `SUPABASE_PROJECT_ID` | Project **Settings → General → Reference ID** | e.g. `smicamiarzmqnyuwyyhl` |
| `SUPABASE_DB_PASSWORD` | Project **Settings → Database** (password you set at project creation) | plain password |

**Do not** use project API keys here. Keys from the **Connect** dialog (`sb_publishable_...`, `sb_secret_...`, anon, service_role) authenticate the Data API, not the Management API / CLI. CI needs a separate **Personal Access Token** tied to your Supabase account.

## 6. Operations: backups, Studio, observability

- **Backups / PITR**: managed automatically by Supabase. Retention and Point-in-Time-Recovery
  availability depend on the project's plan; document your plan's retention and the restore
  procedure (dashboard > Database > Backups). This replaces any manual `pg_dump` cron.
- **Studio**: primary GUI for ad-hoc inspection, the SQL editor and logs. Schema changes made in
  Studio must be captured via `npm run db:diff` to stay in migrations (otherwise they drift).
- **Observability**: use Supabase logs/reports (Postgres, API, pooler) for query and connection
  diagnostics. Watch pooler connection counts against the `pg` Pool `max: 20` in
  `server/src/db.ts`.

## 7. One-time data migration (only if preserving existing data)

If an existing database must be preserved, after the schema migration is applied:

```bash
# Dump data only (no ownership/ACL) from the current database
pg_dump --data-only --no-owner --no-privileges "$OLD_DATABASE_URL" > data.sql

# Restore into Supabase via the session pooler
psql "$SUPABASE_DATABASE_URL" -f data.sql
```

Notes:

- With Supabase Auth as the source of truth, identities live in `auth.users`. Pre-existing users
  must be migrated into `auth.users` (e.g. via the Auth admin API / `supabase` admin import) so the
  `public.users.id` foreign key is satisfied; raw `public.users` rows without a matching auth user
  will violate `users_id_fk`.
- Skip this entirely if starting fresh.

## 8. Security notes

- The Express server connects with a privileged DB role and enforces access in app code, so RLS is
  bypassed for server queries. RLS is left disabled on the app tables in this phase even though
  auth is now Supabase-issued. If you later expose tables directly to the Data API, enable RLS and
  add ownership policies first (see the security checklist in the Supabase skill).
- The `VITE_SUPABASE_ANON_KEY` is public by design and safe with RLS off because the anon key
  alone cannot reach the app tables through the Express server. Keep the `service_role` key
  server-side only and out of the repo; never expose it to the frontend.
- The frontend only holds the Supabase session (access/refresh tokens) and the anon key.

## 9. Future Supabase opportunities (documented, not implemented)

These map directly onto current code and leverage the rest of the platform:

- **Storage for avatars**: avatars are currently base64 data URLs in `users.photo_url` (set via
  `careApi.patchProfile({ photoURL })`, with a 6mb JSON body limit on the server). Move uploads to
  a Supabase Storage bucket and store the public/signed URL instead, shrinking row size and payloads.
- **Realtime instead of polling**: the data provider polls every ~4s (plus a 5s group poll).
  Supabase Realtime (Postgres changes / broadcast) on `sticker_logs`, `interactions` and `groups`
  could push updates and remove the intervals.
- **Edge Functions**: candidates for invite link handling, feedback intake, or scheduled jobs
  (e.g. daily challenge rotation) without growing the Express server.
- **Frontend-direct data access + RLS**: with Supabase Auth in place, a later phase could let the
  client query Supabase directly under RLS policies and shrink or remove the Express data layer.

## 11. `@supabase/server`

The Express API and Edge Functions share [`@supabase/server`](https://github.com/supabase/server) for JWT verification and Supabase client creation.

### Environment variables

Set these in `.env` (and optionally `.env.local` for local overrides). Copy keys from the dashboard **Connect** dialog — never commit `SUPABASE_SECRET_KEY`.

| Variable | Purpose |
| -------- | ------- |
| `SUPABASE_URL` | Project URL (always required) |
| `SUPABASE_PUBLISHABLE_KEY` | RLS-scoped client (`ctx.supabase`) |
| `SUPABASE_SECRET_KEY` | Admin client bypassing RLS (`ctx.supabaseAdmin`) |
| `SUPABASE_JWKS_URL` | JWT verification for `auth: "user"` (derived from `SUPABASE_URL` when unset) |

On hosted Edge Functions these are injected automatically.

### Express

`server/src/supabaseServer.ts` bridges Express to the Web `Request`/`Response` API:

- **`jwtAuth`** — drop-in middleware for existing `/api/*` routes (`auth: "user"`).
- **`withSupabaseExpress({ auth })`** — general middleware; attaches `req.supabaseContext` with `supabase`, `supabaseAdmin`, `userClaims`, and `jwtClaims`.

```typescript
import { withSupabaseExpress } from "./supabaseServer.js";

app.get("/api/example", withSupabaseExpress({ auth: "user" }), async (req, res) => {
  const { data } = await req.supabaseContext!.supabase.from("users").select("id");
  res.json(data);
});
```

Auth modes: `"user"` (valid JWT), `"publishable"`, `"secret"`, `"none"`, plus keyed variants (`"secret:internal"`).

### Edge Functions

Functions live under `supabase/functions/`. Each function has its own `deno.json` importing `@supabase/server`:

```typescript
import { withSupabase } from "npm:@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const { data } = await ctx.supabase.from("users").select();
    return Response.json(data);
  }),
};
```

For `auth: "publishable"`, `auth: "secret"`, or `auth: "none"`, disable the platform JWT gate in `supabase/config.toml`:

```toml
[functions.my-function]
verify_jwt = false
```

Local serve / deploy:

```bash
npm run functions:serve
npm run functions:deploy -- health
```

The sample **`health`** function (`auth: "none"`) is at `supabase/functions/health/`.

## 12. Verification checklist

- `npm run test:run` passes (pg-mem loads the canonical `0001` schema).
- `npx supabase link --project-ref <id>` succeeds; `npm run db:push` applies migrations; `psql`
  connects via the pooler URL with SSL.
- `npm run db:start` brings up the local stack; `npm run db:reset` rebuilds from migrations + seed.
- `npm run db:types` produces no diff after a clean push (CI drift guard passes).
- Auth: email/password + magic link, Google and Apple sign-in all land authenticated (web +
  Capacitor deep link). On first sign-in the `handle_new_user` trigger creates the `public.users`
  row and `careApi.me()` returns the profile; `sub` equals `public.users.id`.
- The server verifies the Supabase JWT via `@supabase/server` (JWKS); a tampered/expired token yields 401; the removed
  `/api/auth/*` routes are gone.
- `npm run dev` against `DATABASE_URL=<supabase pooler>`: create task, toggle sticker,
  social/invite/group flows and admin endpoints all work under the Supabase session.
