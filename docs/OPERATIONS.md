# Operations

Running FinBrain in production: what to configure, how to tell whether it is
healthy, and how to get the data back when something goes wrong.

## Health and readiness

Two endpoints, deliberately not the same thing.

| Endpoint | Question it answers | Behaviour |
| --- | --- | --- |
| `GET /api/v1/health` | Is the process alive? | Always cheap. Touches no dependency, so a slow database cannot cause an orchestrator to restart a process that is fine. |
| `GET /api/v1/ready` | Should this instance receive traffic? | Runs `SELECT 1`. Answers `503` when the database is unreachable. |

Point liveness probes at `/health` and readiness probes, load balancers and
container healthchecks at `/ready`. `docker-compose.prod.yml` already wires the
API container's healthcheck to `/ready`.

## Logs

In production every request produces one JSON line:

```json
{"level":"info","message":"request","timestamp":"2026-10-02T12:00:00.000Z","service":"finbrain-api","requestId":"...","method":"GET","path":"/api/v1/transactions","status":200,"durationMs":40.2,"userId":"..."}
```

`requestId` comes from an inbound `x-request-id` header when a proxy already
set one, and is generated otherwise. It is returned on every response and
included in the body of a `500`, so a user reporting a failure can quote the
exact request. Health probes are excluded so they do not drown everything
else. Logs carry a `userId` but never an email, name or transaction detail.

To forward errors to a vendor (Sentry or similar), extend `reportError` in
`apps/api/src/middleware/observability.ts` — it is the single sink.

## Backups

The `db-backup` service in `docker-compose.prod.yml` dumps the database on a
schedule and prunes old dumps.

| Variable | Default | Meaning |
| --- | --- | --- |
| `BACKUP_SCHEDULE` | `@daily` | When dumps run (go-cron syntax). |
| `BACKUP_KEEP_DAYS` | `7` | Daily dumps retained. |
| `BACKUP_KEEP_WEEKS` | `4` | Weekly dumps retained. |
| `BACKUP_KEEP_MONTHS` | `6` | Monthly dumps retained. |
| `BACKUP_DIR` | `./backups` | Host directory the dumps are written to. |

Dumps land on the host rather than in a named volume, because a backup that
only exists inside Docker dies with the Docker host — one of the failures it
is meant to protect against.

**Copy `BACKUP_DIR` off the machine.** Nothing here does that for you; a dump
sitting on the same disk as the database it came from is not an off-site
backup. The dumps contain complete financial records, so treat them with the
same care as the database: restricted permissions, encrypted at rest, never
committed (`backups/` is in `.gitignore`).

To take a dump immediately rather than waiting for the schedule:

```bash
pnpm db:backup
```

### Restoring

```bash
pnpm db:restore <dump-file> <target-database-url>
```

The script accepts `.dump` (custom format, what the scheduled backups
produce), `.sql` and `.sql.gz`. It requires you to type the target database
name back before it writes anything — the one guard against pointing a restore
at production while meaning to use a scratch copy. Set `RESTORE_CONFIRM` to
skip the prompt in automation.

After restoring, confirm the schema matches the migration history:

```bash
pnpm --filter @finbrain/api exec prisma migrate status
```

### Verifying the backup

An untested restore is not a backup.

```bash
pnpm db:verify-backup
```

This dumps the source database, restores it into a disposable PostgreSQL
container, and compares row counts table by table. It uses a throwaway
container rather than a second database on the same server on purpose: the
dump has to be sufficient to rebuild on fresh infrastructure, borrowing
nothing from the machine it came from. The source is only ever read, so it is
safe to run against production.

Run it after any schema migration and on a recurring schedule. Last verified
against a 32-table database: `PASS: 32 tables, 222 rows restored identically.`

## Required configuration

The API refuses to start in production when these are missing, rather than
falling back to a development default:

- `DATABASE_URL`
- `CLERK_SECRET_KEY` — authentication fails closed without it
- `ENCRYPTION_KEY` — 32 bytes, hex or base64; encrypts stored Plaid access
  tokens. Rotating it makes existing linked banks unreadable and they must be
  reconnected.

`DEV_MODE=true` together with `NODE_ENV=production` is rejected outright: it
used to authenticate every caller as the development user.
