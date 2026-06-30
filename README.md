# CareStickers Application

CareStickers is a social self-care tracking application that allows users to set personal and community goals, earn stickers for completing them, and share progress with friends.

## Features

- **Personal & Global Goals**: Create your own self-care goals or participate in community-wide global goals.
- **Daily Challenges**: Admins can set special "Daily Challenges" that appear prominently for all users.
- **Sticker System**: Earn vibrant stickers for every goal completed.
- **Social Interaction**: Invite friends, share progress, and send high-fives.
- **Group Management**: Create or join groups using invite codes. Includes a "Group Admin" role for creators.
- **Admin Portal**: Dashboard for managing community goals, tracking overall progress, and searching for specific users.
- **Multi-Auth**: Sign in with email and password, magic link, Google, or Apple — all via Supabase Auth.
- **Onboarding**: Interactive tutorial for new users.

## Technical Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS.
- **Backend**: Node.js, Express, managed PostgreSQL on **Supabase** (`pg`).
- **Auth**: **Supabase Auth (GoTrue)** is the source of truth — email/password + magic link, Google and Apple. The frontend uses `@supabase/supabase-js`; the Express API verifies Supabase access tokens via **`@supabase/server`** (JWKS + RLS-scoped clients). Edge Functions use `withSupabase` from the same package. See [docs/SUPABASE.md](docs/SUPABASE.md).
- **Animations**: Framer Motion (`motion/react`) for transitions and progress animations.
- **Icons**: Lucide React.
- **Native shells**: [Capacitor](https://capacitorjs.com/) (`ios/`, `android/`) wraps the web UI for App Store and Google Play builds.

## Project Structure

| Area                            | Location                                                  |
| ------------------------------- | --------------------------------------------------------- |
| React UI & state                | `src/App.tsx`, `src/components/`                          |
| Supabase browser client         | `src/lib/supabaseClient.ts`                               |
| API client (session token)      | `src/api/client.ts`, `src/api/careApi.ts`                 |
| Shared types                    | `src/types.ts`, generated DB types `src/types/database.ts` |
| HTTP API & routes               | `server/src/index.ts`                                     |
| `@supabase/server` (Express)    | `server/src/supabaseServer.ts`                            |
| Edge Functions                  | `supabase/functions/`                                     |
| Database schema (canonical)     | `supabase/migrations/` (`0001` app tables, `0002` auth link) |
| DB pool, SSL & optional auto-migrate | `server/src/db.ts`                                   |
| Supabase CLI config & seed      | `supabase/config.toml`, `supabase/seed.sql`               |
| Capacitor config                | `capacitor.config.ts`                                     |
| Native projects                 | `android/`, `ios/` (generated; see **Mobile apps** below) |

In development, the browser calls `/api/*` via the Vite proxy. In production, hosting the API and static files on the **same HTTPS origin** avoids CORS issues for the web app. **Capacitor WebViews are not same-origin** with your server: build the client with an explicit `VITE_API_BASE` pointing at your public API (see **Mobile apps**).

## Prerequisites

- Node.js 20+ recommended (CI uses Node.js 24).
- A Supabase project (managed PostgreSQL + Auth). For local-only Postgres, Docker also works (see below).

## Configuration

Copy `.env.example` to `.env` and set variables for both the API and the Vite client. Full
Supabase setup (linking, providers, local stack, CI, ops) is in [docs/SUPABASE.md](docs/SUPABASE.md).

**Required for the API**

- `DATABASE_URL` — PostgreSQL connection string. For Supabase use the **Supavisor session pooler** (port 5432): `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
- `SUPABASE_URL` — `https://<project-ref>.supabase.co`. Used by `@supabase/server` for client creation and JWKS derivation.
- `SUPABASE_PUBLISHABLE_KEY` — Publishable key (`sb_publishable_...`) from the dashboard Connect dialog. Used for RLS-scoped clients.
- `SUPABASE_SECRET_KEY` — Secret key (`sb_secret_...`, server-only). Powers `ctx.supabaseAdmin` and `auth: "secret"` handlers. Never commit or expose to the frontend.
- `SUPABASE_JWKS_URL` — JWKS endpoint for JWT verification (`auth: "user"`). Defaults to `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` when unset.
- `FRONTEND_URL` — One or more comma-separated browser origins for CORS (e.g. `https://app.example.com` or `http://localhost:3000`).
- `ADMIN_EMAILS` — Comma-separated emails that receive the `admin` role.

**Optional**

- `PGSSL=disable` — Turn off TLS for the DB connection (use for local Docker Postgres; Supabase requires TLS so leave unset there).
- `SUPABASE_JWKS_URL` — Override the derived JWKS URL (or use inline `SUPABASE_JWKS` JSON instead).
- `APPLY_SCHEMA=true` — On server startup, applies `supabase/migrations/0001_initial_schema.sql` once (handy for local dev; prefer `supabase db push` / `db reset`).
- `PORT` — API port (default `3001`).
- `CORS_ORIGINS` — Extra allowed CORS origins (comma-separated).
- `ALLOW_CAPACITOR_ORIGINS` — Set to `false` to disable automatic allowance of Capacitor WebView origins (`capacitor://localhost`, `ionic://localhost`, `https://localhost`). Default allows them.

**Auth providers (Google / Apple / email)** — configured in the Supabase dashboard and
`supabase/config.toml`, not in the server env. See [docs/SUPABASE.md](docs/SUPABASE.md#2-auth-provider-configuration).

**Client-only (Vite)**

- `VITE_SUPABASE_URL` — `https://<project-ref>.supabase.co`.
- `VITE_SUPABASE_ANON_KEY` — The anon/publishable key (public by design).
- `VITE_ADMIN_EMAILS` — Comma-separated emails treated as admins in the UI (align with `ADMIN_EMAILS`).
- `VITE_API_BASE` — **Required for Capacitor / mobile builds.** Full base URL of your API **without a trailing slash**, e.g. `https://api.example.com`. For same-origin web deployment, leave unset.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create the database schema**

   Link the repo to your Supabase project and apply migrations:

   ```bash
   npx supabase login
   npx supabase link --project-ref <SUPABASE_PROJECT_ID>
   npm run db:push
   ```

   For local-only Postgres you can instead set `APPLY_SCHEMA=true` in `.env` for the first run
   (applies `supabase/migrations/0001_initial_schema.sql`), or use the full local stack with
   `npm run db:start`. See [docs/SUPABASE.md](docs/SUPABASE.md).

3. **Run in development** (Vite on port 3000, API on 3001, with `/api` proxied)

   ```bash
   npm run dev
   ```

   Alternatively: `npm run dev:client` and `npm run dev:server` in two terminals.

4. **Production build (client)**

   ```bash
   npm run build
   ```

5. **Run the server** (serves API and, if `dist/` exists, the static client)

   ```bash
   npm start
   ```

   Set `FRONTEND_URL` to your public site URL. Ensure `DATABASE_URL` and `SUPABASE_URL` (for token verification) are set in the environment.

## Scripts

| Script                     | Description                                                                 |
| -------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`              | Vite + API with file watching                                               |
| `npm run dev:client`       | Frontend only                                                               |
| `npm run dev:server`       | API only                                                                    |
| `npm run build`            | Build client to `dist/`                                                     |
| `npm start`                | Run API (and static files from `dist/` if present)                          |
| `npm run lint`             | Typecheck with `tsc --noEmit`                                               |
| `npm test`                 | Run tests in watch mode ([Vitest](https://vitest.dev/))                     |
| `npm run test:run`         | Run tests once (CI)                                                         |
| `npm run build:cap`        | Web build for native (`base: './'`) and `cap sync` into `android/` / `ios/` |
| `npm run cap:sync`         | Run `cap sync` only (after `npm run build` or `build:cap`)                  |
| `npm run cap:open:android` | Open Android project in Android Studio                                      |
| `npm run cap:open:ios`     | Open iOS project in Xcode (macOS)                                           |
| `npm run db:start` / `db:stop` | Start / stop the full local Supabase stack (Docker)                     |
| `npm run db:push`          | Apply migrations to the linked Supabase project                             |
| `npm run db:reset`         | Rebuild the local DB from migrations + `seed.sql`                           |
| `npm run db:migration:new` | Scaffold a new migration (`supabase migration new <name>`)                  |
| `npm run db:diff`          | Capture Studio/manual changes into a migration                              |
| `npm run db:types`         | Regenerate `src/types/database.ts` from the linked schema                   |

## Testing

Tests use **Vitest**, **Testing Library**, and **jsdom** for React components. Server-side logic and a **mocked PostgreSQL** ([pg-mem](https://github.com/oguimbal/pg-mem)) exercise the canonical schema `supabase/migrations/0001_initial_schema.sql` (the auth-link migration `0002` is excluded since pg-mem has no `auth` schema) without a real database.

| Location                                | What is covered                                                      |
| --------------------------------------- | -------------------------------------------------------------------- |
| `server/src/mappers.test.ts`            | Row → API DTO mappers                                                |
| `server/src/corsConfig.test.ts`         | `FRONTEND_URL` / `CORS_ORIGINS` / Capacitor origins                  |
| `server/src/schema.pgmem.test.ts`       | Schema applies in pg-mem; basic `INSERT` flows                       |
| `server/test/createPgMemPool.ts`        | Helper: registers `pgcrypto` + `gen_random_uuid`, loads `0001` migration |
| `src/components/ErrorBoundary.test.tsx` | Error boundary UI                                                    |
| `src/api/client.test.ts`                | Supabase session token, `fetch` + auth headers, 401 sign-out         |

Run `npm run test:run` before releases. pg-mem is not identical to production PostgreSQL; keep staging tests against a real Postgres instance for critical paths.

## Production deployment (web + API)

1. **Database** — Apply migrations to Supabase with `npm run db:push` (CI does this on merge to `main`; see [docs/SUPABASE.md](docs/SUPABASE.md)).
2. **Environment** — Set `DATABASE_URL` (Supabase pooler), `SUPABASE_URL`, `FRONTEND_URL` (your public web origin), `ADMIN_EMAILS`, plus `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` for the client. Use HTTPS everywhere in production.
3. **Build the client** — `npm run build` produces `dist/`.
4. **Run the server** — `npm start` serves `/api` and static files from `dist/` when present. Put a reverse proxy (e.g. nginx, Caddy, or your platform’s edge) in front for TLS termination if needed.
5. **Same-origin (recommended for web)** — If the SPA and API share one hostname (`https://example.com`), you do not need `VITE_API_BASE`; the client uses relative `/api` paths.

### Docker

- **Image**: `Dockerfile` builds the Vite client and runs the Node API with `tsx`.
- **Compose**: `docker-compose.yml` runs PostgreSQL plus the app. On **first** creation of the Postgres volume, `supabase/migrations/0001_initial_schema.sql` is applied automatically via `/docker-entrypoint-initdb.d` (no manual `psql` step). The auth-link migration `0002` is not applied here because plain Postgres has no `auth` schema — for full Supabase Auth parity locally, use `npm run db:start`. The app sets `APPLY_SCHEMA=false` so the Node process does not duplicate that work.

**Full stack (build + start DB + API):**

```bash
npm run docker:up
# or: ./scripts/docker-up.sh   /   .\scripts\docker-up.ps1
```

**Postgres only** (for local `npm run dev` with Vite on :3000 and the API on the host): start the DB, then point `DATABASE_URL` at `postgres://care:care@localhost:5432/carestickers` (override `POSTGRES_*` / `POSTGRES_PORT` in `.env` if you change defaults).

```bash
npm run docker:db
# or: docker compose up -d db
```

**Stop containers:** `npm run docker:down` or `docker compose down`.

Set `DATABASE_URL`, `SUPABASE_URL`, `FRONTEND_URL`, and the `VITE_SUPABASE_*` client vars for real use; see `.env.example`. Adjust credentials and never commit real secrets.

## Mobile apps (iOS & Android)

The app is a **WebView shell** around the same React bundle ([Capacitor](https://capacitorjs.com/docs)). Store distribution is **not** automatic: you build signed binaries in Xcode / Android Studio and submit through [App Store Connect](https://developer.apple.com/app-store-connect/) and the [Google Play Console](https://play.google.com/console).

### One-time native projects

If `android/` or `ios/` are missing:

```bash
npm install
npm run build
npx cap add android
npx cap add ios   # macOS recommended; CocoaPods required for full iOS builds
```

### Build for native (after code changes)

```bash
# Set API URL for the WebView (your deployed HTTPS API)
set VITE_API_BASE=https://api.yourdomain.com   # Windows PowerShell: $env:VITE_API_BASE='...'
npm run build:cap
```

Then open the IDE:

```bash
npm run cap:open:android
npm run cap:open:ios
```

- **Android**: Generate a signing key, configure **Play App Signing**, build **AAB** or **APK** in Android Studio, upload to Play Console.
- **iOS**: On a Mac, install **Xcode** and **CocoaPods** (`cd ios/App && pod install`), set **Signing & Capabilities** in Xcode, archive, upload to App Store Connect.

### OAuth in embedded WebViews

Google and Apple may restrict sign-in inside generic WebViews. If login fails in the app but works in Safari/Chrome, you may need **OAuth clients** of type **iOS** / **Android** in Google Cloud Console, **Sign in with Apple** enabled for the app bundle ID, or the [Capacitor Browser](https://capacitorjs.com/docs/apis/browser) plugin to complete OAuth in the system browser. Plan QA on real devices.

### App Store & Google Play checklist (typical)

| Requirement            | Notes                                                                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developer accounts     | [Apple Developer Program](https://developer.apple.com/programs/) (paid) and [Google Play developer registration](https://play.google.com/console/signup) (one-time fee).     |
| App icons & splash     | Replace default Capacitor assets in `android/` / `ios/` or use [@capacitor/assets](https://github.com/ionic-team/capacitor-assets).                                          |
| Privacy policy URL     | Both stores require a public URL describing data use; host a page and link it in store listings.                                                                             |
| App IDs & signing      | iOS: Bundle ID matches `appId` in `capacitor.config.ts` (`com.carestickers.app` — change if you own a different identifier). Android: application ID in Gradle should align. |
| ATS / network security | API must use **HTTPS** on a trusted certificate.                                                                                                                             |
| Review guidelines      | Follow [App Review](https://developer.apple.com/app-store/review/) and [Play policy](https://play.google.com/about/developer-content-policy/).                               |

## Security Notes

- Credentials and identities are managed by **Supabase Auth**; the Express API verifies Supabase access tokens (JWKS) and enforces ownership/admin checks on the server.
- The client holds only the Supabase session (access/refresh tokens) and the public anon key. The `service_role` key must stay server-side and out of the repo.
- RLS is left disabled on the app tables in this phase because the privileged server role enforces access in app code. If you expose tables directly to the Data API later, enable RLS with ownership policies first — see [docs/SUPABASE.md](docs/SUPABASE.md#8-security-notes).
- Keep database credentials, the Supabase access token / DB password, and provider secrets out of version control (use `.env`, which is gitignored).

## License

See SPDX headers in source files where applicable (e.g. `App.tsx`).
