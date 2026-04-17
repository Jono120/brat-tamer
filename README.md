# CareStickers Application

CareStickers is a social self-care tracking application that allows users to set personal and community goals, earn stickers for completing them, and share progress with friends.

## Features

- **Personal & Global Goals**: Create your own self-care goals or participate in community-wide global goals.
- **Daily Challenges**: Admins can set special "Daily Challenges" that appear prominently for all users.
- **Sticker System**: Earn vibrant stickers for every goal completed.
- **Social Interaction**: Invite friends, share progress, and send high-fives.
- **Group Management**: Create or join groups using invite codes. Includes a "Group Admin" role for creators.
- **Admin Portal**: Dashboard for managing community goals, tracking overall progress, and searching for specific users.
- **Multi-Auth**: Sign in with email and password, Google (OAuth), or Apple (Sign in with Apple on the web).
- **Onboarding**: Interactive tutorial for new users.

## Technical Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS.
- **Backend**: Node.js, Express, PostgreSQL (`pg`), JWT sessions.
- **Auth**: bcrypt for password hashes; Passport for Google OAuth; Apple ID tokens verified with Apple’s JWKS.
- **Animations**: Framer Motion (`motion/react`) for transitions and progress animations.
- **Icons**: Lucide React.
- **Native shells**: [Capacitor](https://capacitorjs.com/) (`ios/`, `android/`) wraps the web UI for App Store and Google Play builds.

## Project Structure

| Area                            | Location                                                  |
| ------------------------------- | --------------------------------------------------------- |
| React UI & state                | `src/App.tsx`, `src/components/`                          |
| API client & token storage      | `src/api/client.ts`, `src/api/careApi.ts`                 |
| Shared types                    | `src/types.ts`                                            |
| HTTP API & routes               | `server/src/index.ts`                                     |
| PostgreSQL schema               | `server/schema.sql`                                       |
| DB pool & optional auto-migrate | `server/src/db.ts`                                        |
| Capacitor config                | `capacitor.config.ts`                                     |
| Native projects                 | `android/`, `ios/` (generated; see **Mobile apps** below) |

In development, the browser calls `/api/*` via the Vite proxy. In production, hosting the API and static files on the **same HTTPS origin** avoids CORS issues for the web app. **Capacitor WebViews are not same-origin** with your server: build the client with an explicit `VITE_API_BASE` pointing at your public API (see **Mobile apps**).

## Prerequisites

- Node.js 20+ recommended.
- A PostgreSQL database.

## Configuration

Copy `.env.example` to `.env` and set variables for both the API and (where needed) the Vite client.

**Required for the API**

- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgres://user:pass@localhost:5432/carestickers`).
- `JWT_SECRET` — Long random string used to sign access tokens.
- `FRONTEND_URL` — One or more comma-separated origins for the web app (e.g. `https://app.example.com` or `http://localhost:3000` for local dev). Used for OAuth redirects and CORS. Must include every URL users open in a browser.
- `ADMIN_EMAILS` — Comma-separated emails that receive the `admin` role on registration or first OAuth login.

**Optional**

- `APPLY_SCHEMA=true` — On server startup, runs `server/schema.sql` once (handy for local dev; prefer explicit migrations in production).
- `PORT` — API port (default `3001`).
- `SESSION_SECRET` — Session cookie secret for OAuth state (defaults to `JWT_SECRET` if unset).
- `CORS_ORIGINS` — Extra allowed CORS origins (comma-separated), e.g. staging URLs or a separate marketing site.
- `ALLOW_CAPACITOR_ORIGINS` — Set to `false` to disable automatic allowance of Capacitor WebView origins (`capacitor://localhost`, `ionic://localhost`, `https://localhost`). Default is to allow them so native builds can call the API.

**Google Sign-In**

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` — Must match the authorized redirect URI in Google Cloud Console (e.g. `http://localhost:3001/api/auth/google/callback`).

**Apple Sign-In**

- Server: `APPLE_CLIENT_ID` — Services ID (audience for the `id_token`).
- Client (Vite): `VITE_APPLE_CLIENT_ID` — Same Services ID for Sign in with Apple JS.
- Configure the Services ID redirect domain and return URL to match your deployed origin.

**Client-only (Vite)**

- `VITE_ADMIN_EMAILS` — Comma-separated emails treated as admins in the UI (should align with `ADMIN_EMAILS` on the server).
- `VITE_API_BASE` — **Required for Capacitor / mobile builds.** Full base URL of your API **without a trailing slash**, e.g. `https://api.example.com`. The WebView cannot use relative `/api` calls the way a browser on the same host can. For normal web deployment on the same domain as the API, leave unset so requests stay same-origin.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create the database schema**

   Either apply the SQL file manually:

   ```bash
   psql "$DATABASE_URL" -f server/schema.sql
   ```

   Or set `APPLY_SCHEMA=true` in `.env` for the first local run (then remove it or leave it off in production).

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

   Set `FRONTEND_URL` to your public site URL. Ensure `DATABASE_URL`, `JWT_SECRET`, and auth provider credentials are set in the environment.

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

## Testing

Tests use **Vitest**, **Testing Library**, and **jsdom** for React components. Server-side logic and a **mocked PostgreSQL** ([pg-mem](https://github.com/oguimbal/pg-mem)) exercise `server/schema.sql` without a real database.

| Location                                | What is covered                                                      |
| --------------------------------------- | -------------------------------------------------------------------- |
| `server/src/mappers.test.ts`            | Row → API DTO mappers                                                |
| `server/src/corsConfig.test.ts`         | `FRONTEND_URL` / `CORS_ORIGINS` / Capacitor origins                  |
| `server/src/schema.pgmem.test.ts`       | Schema applies in pg-mem; basic `INSERT` flows                       |
| `server/test/createPgMemPool.ts`        | Helper: registers `pgcrypto` + `gen_random_uuid`, loads `schema.sql` |
| `src/components/ErrorBoundary.test.tsx` | Error boundary UI                                                    |
| `src/api/client.test.ts`                | Token storage, `fetch` + auth headers, 401 handling                  |

Run `npm run test:run` before releases. pg-mem is not identical to production PostgreSQL; keep staging tests against a real Postgres instance for critical paths.

## Production deployment (web + API)

1. **Database** — Run `server/schema.sql` against your production PostgreSQL instance (or use a migration tool for ongoing changes).
2. **Environment** — Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` (your public web origin), `ADMIN_EMAILS`, and OAuth secrets on the host. Use HTTPS everywhere in production.
3. **Build the client** — `npm run build` produces `dist/`.
4. **Run the server** — `npm start` serves `/api` and static files from `dist/` when present. Put a reverse proxy (e.g. nginx, Caddy, or your platform’s edge) in front for TLS termination if needed.
5. **Same-origin (recommended for web)** — If the SPA and API share one hostname (`https://example.com`), you do not need `VITE_API_BASE`; the client uses relative `/api` paths.

### Docker

- **Image**: `Dockerfile` builds the Vite client and runs the Node API with `tsx`.
- **Compose**: `docker-compose.yml` runs PostgreSQL plus the app. On **first** creation of the Postgres volume, `server/schema.sql` is applied automatically via `/docker-entrypoint-initdb.d` (no manual `psql` step). The app sets `APPLY_SCHEMA=false` so the Node process does not duplicate that work.

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

Set `JWT_SECRET`, `SESSION_SECRET`, `FRONTEND_URL`, and OAuth variables for real use; see `.env.example`. Adjust credentials and never commit real secrets.

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

- Passwords are stored as bcrypt hashes; API routes enforce ownership and admin checks on the server.
- JWTs are stored in `localStorage` on the client. For stricter deployments, consider httpOnly cookies and refresh-token rotation.
- Keep `JWT_SECRET`, database credentials, and OAuth client secrets out of version control (use `.env`, which is gitignored).

## License

See SPDX headers in source files where applicable (e.g. `App.tsx`).
