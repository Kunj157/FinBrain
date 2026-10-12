# Deployment

FinBrain deploys as three pieces: a Node API, a static build of the React
app, and a Postgres database. `render.yaml` in the repository root describes
the first two as a [Render Blueprint](https://render.com/docs/blueprint-spec);
the database is Neon.

The whole thing runs on free tiers, with no credit card, and nothing about it
is a one-way door — see [Scaling up](#scaling-up).

## What is deployed, and what is not

| Piece | Where | Why |
| --- | --- | --- |
| API (`apps/api`) | Render web service, free | Node process, builds from the repo |
| Web (`apps/web`) | Render static site, free | Vite build, served from a CDN |
| Database | Neon, free | Managed Postgres 16 |
| Redis | **not deployed** | Nothing in `apps/api/src` imports a Redis client. It appears only in the compose files. |
| ML service (`apps/ml-service`) | **not deployed** | `/forecast` falls back to a local computation when the service is unreachable, so forecasting works without it. The image is ~2.9 GB, which no free tier will carry. |

Deploy the ML service later if you want Prophet/ARIMA rather than the local
fallback; point `ML_SERVICE_URL` at it and the API picks it up.

### Why Neon rather than Render's own Postgres

Render's free Postgres is **deleted 30 days after creation**. For a demo
that is meant to stay up, that quietly takes the data with it. Neon's free
tier has no expiry (1 GB per project), so the blueprint takes `DATABASE_URL`
as a secret instead of provisioning a Render database.

## First deploy

1. **Create the database.** Sign up at [neon.com](https://neon.com), create a
   project, and copy the **pooled** connection string. It looks like
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`.

2. **Get Clerk keys.** From [clerk.com](https://clerk.com), create an
   application and copy the publishable key (`pk_...`) and secret key
   (`sk_...`). The API refuses to start in production without the secret key —
   that is deliberate, see [OPERATIONS.md](./OPERATIONS.md).

3. **Create the Blueprint.** In Render, *New → Blueprint*, connect this
   repository and pick `main`. Render reads `render.yaml` and creates
   `finbrain-api` and `finbrain-web`.

4. **Fill in the secrets** Render prompts for. `ENCRYPTION_KEY` is generated
   automatically and must then be left alone — rotating it makes stored Plaid
   tokens unreadable.

   | Service | Variable | Value |
   | --- | --- | --- |
   | `finbrain-api` | `DATABASE_URL` | Neon pooled connection string |
   | `finbrain-api` | `CLERK_SECRET_KEY` | `sk_...` |
   | `finbrain-api` | `FRONTEND_URL` | the static site's URL (step 5) |
   | `finbrain-api` | `GROQ_API_KEY` | from [console.groq.com](https://console.groq.com), free; the advisor is unavailable without it |
   | `finbrain-api` | `PLAID_CLIENT_ID` / `PLAID_SECRET` | optional; bank linking is unavailable without them |
   | `finbrain-web` | `VITE_API_URL` | `https://finbrain-api.onrender.com/api/v1` |
   | `finbrain-web` | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_...` |

5. **Fix the two circular URLs.** Neither service knows the other's URL until
   both exist. After the first deploy, set `FRONTEND_URL` on the API to the
   static site's URL and `VITE_API_URL` on the web service to the API's, then
   redeploy both. `VITE_*` values are read at build time, so the web service
   needs a rebuild, not just a restart — a restart will silently keep the old
   value.

6. **Check it.** `curl https://finbrain-api.onrender.com/api/v1/ready` should
   return `{"status":"ready","database":"up"}`. If it returns 503 the API is
   up but cannot reach Neon.

Migrations run from the start command (`prisma migrate deploy`), so the schema
is created on first boot. It is idempotent and replays harmlessly on restart.

## The demo account

A fresh database is empty and production auth is fail-closed, so a visitor
would otherwise sign in and find empty states everywhere. `seed:demo` fills
one named account with six months of history — four accounts, ~120
transactions across USD, EUR, GBP and INR, four monthly budgets and three
goals — so the dashboard, analytics, budgets, goals and the advisor all have
something to show.

The Clerk user has to exist first: the API creates the matching row on first
sign-in, so sign in once as the demo user before seeding.

```bash
DATABASE_URL="<neon pooled url>" \
DEMO_USER_EMAIL=demo@yourdomain.com \
DEMO_SEED_CONFIRM=demo@yourdomain.com \
pnpm --filter @finbrain/api seed:demo
```

The confirmation has to match the target email. The script deletes every
transaction, account, budget and goal belonging to that user before
re-creating them, so it asks you to name the target twice rather than take it
from one mistyped variable. It is scoped to that account and touches no other
user.

The data is generated from a fixed seed, so re-running it reproduces the same
demo rather than a different story each time. That makes it safe to run on a
schedule to reset whatever visitors have changed.

### One-click access

Visitors should not have to sign up to look around, so the landing page's
**Try the Live Demo** button (and any link to `/sign-in?demo=1`) signs them
straight into the demo account. The API's public `POST /api/v1/demo/session`
mints a Clerk sign-in ticket valid for two minutes, and the web app redeems it
with Clerk's `ticket` strategy. No password is shipped in the bundle.

It only ever issues tickets for the account named by `DEMO_USER_EMAIL` on
`finbrain-api`; with that unset the endpoint returns 404. The endpoint is
rate-limited per IP, and the demo account cannot be deleted through the app.

Visitors share that one account, so the nightly `Reset demo data` workflow
(`.github/workflows/reset-demo.yml`) re-runs `seed:demo` against it. It needs
the repository secrets `DEMO_DATABASE_URL` (the Neon pooled URL) and
`DEMO_USER_EMAIL`, and skips cleanly without them.

The landing page also requests `/health` on load, so a sleeping free-tier API
starts waking while the visitor is still reading.

## Free tier behaviour

- **The API sleeps.** Render spins down a free web service after 15 minutes
  without traffic; the next request takes roughly 50 seconds while it wakes.
  The static site is unaffected, so the app loads instantly and then waits on
  its first API call. This is the single most noticeable thing about the free
  deployment.
- **Neon scales to zero** after 5 minutes idle and resumes on connection.
- **1 GB** of database storage.

## Scaling up

Nothing here needs rewriting to grow:

- **Keep the API awake / more memory:** change `plan: free` to `plan: starter`
  in `render.yaml`. That is the whole change.
- **Bigger database:** upgrade the Neon project, or point `DATABASE_URL` at any
  managed Postgres. Nothing in the application knows which provider it is.
- **Leave Render entirely:** the API is an ordinary Node process with a
  `Dockerfile`, and the web build is static files. The build and start commands
  in `render.yaml` transfer directly to Fly, Railway, Cloud Run or a VM; only
  `render.yaml` itself is vendor-specific.
- **Self-host the lot:** `docker-compose.prod.yml` already describes the full
  stack including Redis, the ML service and nginx.

## Secrets

Never commit a `.env`. Note that **Prisma loads `apps/api/.env` into the
process** when the client initialises, so a stray file on a host can inject
configuration that was never set deliberately. Platform environment variables
take precedence over it, and `.dockerignore` keeps it out of build contexts,
but the safest answer is for it not to be on the server at all.

## Backups

The deployed database is Neon's, so Neon's own backup and
point-in-time-restore applies rather than the `db-backup` service in
`docker-compose.prod.yml`. `scripts/verify-backup.sh` still works against it:

```bash
DATABASE_URL="<neon pooled url>" ./scripts/verify-backup.sh
```

See [OPERATIONS.md](./OPERATIONS.md) for the self-hosted backup path.
