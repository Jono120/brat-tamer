# Deployment

CareStickers ships as one Node process: Express serves `/api` and, when `dist/` is present, the
Vite-built SPA from the same origin.

## Production checklist (web + API)

1. **Database** — Apply migrations with `npm run db:push`. CI runs this on merge to `main` ([SUPABASE.md §5](SUPABASE.md#5-cicd)).
2. **Environment** — Set `DATABASE_URL` (Supavisor pooler), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `FRONTEND_URL`, `ADMIN_EMAILS`. Build-time client vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Use HTTPS everywhere.
3. **Build** — `npm run build` produces `dist/`.
4. **Run** — `npm start` serves API + static assets. Terminate TLS at your reverse proxy (nginx, Caddy, platform edge) if needed.
5. **Same-origin (web)** — When SPA and API share one hostname (`https://example.com`), leave `VITE_API_BASE` unset; the client uses relative `/api` paths.

Full env reference: [.env.example](../.env.example) and [DEVELOPMENT.md](DEVELOPMENT.md#configuration).

## Docker

### Image

`Dockerfile` builds the Vite client (with `VITE_*` build-args) and runs the Node API via native
TypeScript stripping (Node 24).

### GHCR (CI)

On merge to `main`, the **Container** workflow (`.github/workflows/deploy.yml`) pushes `ghcr.io/<owner>/<repo>:<sha>`.

Before the first build, set repository **Variables** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions → Variables). Optional: `VITE_ADMIN_EMAILS`.

Pull and run on your host or PaaS. Runtime still needs `DATABASE_URL`, `SUPABASE_URL`, keys, etc.
Set GHCR package visibility to **private** after the first push.

### Docker Compose (local / self-hosted)

`docker-compose.yml` runs PostgreSQL plus the app.

- On **first** Postgres volume creation, `supabase/migrations/0001_initial_schema.sql` is applied via `/docker-entrypoint-initdb.d`. Migration `0002` is skipped (plain Postgres has no `auth` schema). For full Supabase Auth locally, use `npm run db:start` instead.
- The app sets `APPLY_SCHEMA=false` so the Node process does not duplicate init work.

**Full stack:**

```bash
npm run docker:up
# or: ./scripts/docker-up.sh   /   .\scripts\docker-up.ps1
```

**Postgres only** (host runs `npm run dev`):

```bash
npm run docker:db
# DATABASE_URL=postgres://care:care@localhost:5432/carestickers
```

**Stop:** `npm run docker:down` or `docker compose down`.

## Mobile

Capacitor builds are not deployed through this pipeline. Set `VITE_API_BASE` per environment and follow [MOBILE_RELEASE.md](MOBILE_RELEASE.md).

## AWS (proposal)

A staged AWS test-environment plan (App Runner, ECR, Secrets Manager, same-region Supabase) is in [AWS_DEPLOYMENT_PLAN.md](AWS_DEPLOYMENT_PLAN.md). Nothing in that document has been provisioned yet.

## Security

- Supabase Auth is the identity source; the API verifies JWTs via JWKS and enforces ownership/admin checks in application code.
- `SUPABASE_SECRET_KEY` and `DATABASE_URL` are server-only — never in the client bundle or repo.
- RLS protects direct client and Realtime access; the API uses a privileged DB role. Details: [SUPABASE.md §8](SUPABASE.md#8-security-notes).

## Related docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — component map
- [DEVELOPMENT.md](DEVELOPMENT.md) — local setup and scripts
- [SUPABASE.md](SUPABASE.md) — migrations CI and hosted project ops
