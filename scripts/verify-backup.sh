#!/usr/bin/env bash
#
# Prove the backup/restore path actually works.
#
# Dumps the source database, restores it into a disposable PostgreSQL
# container, and compares row counts table by table. An untested restore is
# not a backup; this is what makes the claim checkable rather than
# aspirational.
#
# The restore target is a throwaway container rather than another database on
# the same server, because that is the scenario that actually matters: the
# dump must be enough to rebuild on fresh infrastructure, with nothing
# borrowed from the machine it came from.
#
# Usage:
#   scripts/verify-backup.sh [source-database-url]
#
# Safe to run against production: the source is only ever read from.

set -euo pipefail

SOURCE_URL=${1:-${DATABASE_URL:-}}
PG_IMAGE=${PG_IMAGE:-postgres:16-alpine}

if [[ -z "$SOURCE_URL" ]]; then
  echo "usage: $0 <source-database-url>   (or set DATABASE_URL)" >&2
  exit 2
fi

for tool in pg_dump psql docker; do
  command -v "$tool" >/dev/null || { echo "error: $tool is required" >&2; exit 1; }
done

CONTAINER="finbrain-restore-check-$$"
WORK_DIR=$(mktemp -d)
DUMP_FILE="$WORK_DIR/verify.dump"

cleanup() {
  # Both targets were created by this script moments ago: the container by the
  # docker run below, the directory by mktemp. Nothing pre-existing is touched.
  docker rm --force "$CONTAINER" >/dev/null 2>&1 || true
  rm -rf -- "$WORK_DIR"
}
trap cleanup EXIT

echo "==> Dumping source database"
pg_dump --format=custom --no-owner --no-privileges --file "$DUMP_FILE" "$SOURCE_URL"
echo "    $(du -h "$DUMP_FILE" | cut -f1) written"

echo "==> Starting disposable $PG_IMAGE"
# An unspecified host port lets the kernel pick a free one, so this cannot
# collide with the developer's own database or with a concurrent run.
docker run --detach --rm --name "$CONTAINER" \
  --env POSTGRES_PASSWORD=verify \
  --env POSTGRES_USER=verify \
  --env POSTGRES_DB=verify \
  --publish 127.0.0.1::5432 \
  "$PG_IMAGE" >/dev/null

HOST_PORT=$(docker port "$CONTAINER" 5432/tcp | head -1 | sed 's/.*://')
SCRATCH_URL="postgresql://verify:verify@127.0.0.1:${HOST_PORT}/verify"

echo "    waiting for it to accept connections"
for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready --quiet --username verify && break
  sleep 1
done
docker exec "$CONTAINER" pg_isready --quiet --username verify \
  || { echo "FAIL: restore target never became ready" >&2; exit 1; }

echo "==> Restoring through scripts/restore-db.sh"
RESTORE_CONFIRM=verify "$(dirname "$0")/restore-db.sh" "$DUMP_FILE" "$SCRATCH_URL" >/dev/null

# Counting every table's rows is the check that matters: a restore that
# reports success but silently drops a table would otherwise pass.
count_rows() {
  psql --tuples-only --no-align --dbname "$1" <<'SQL'
SELECT string_agg(line, E'\n' ORDER BY line) FROM (
  SELECT format('%s=%s', c.relname,
    (xpath('/row/c/text()',
      query_to_xml(format('SELECT count(*) AS c FROM %I.%I', n.nspname, c.relname),
                   false, true, '')))[1]::text::bigint) AS line
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' AND n.nspname = 'public'
) t;
SQL
}

echo "==> Comparing row counts"
SOURCE_COUNTS=$(count_rows "$SOURCE_URL")
RESTORED_COUNTS=$(count_rows "$SCRATCH_URL")

if [[ -z "$SOURCE_COUNTS" ]]; then
  echo "FAIL: source database has no tables in the public schema" >&2
  exit 1
fi

if [[ "$SOURCE_COUNTS" != "$RESTORED_COUNTS" ]]; then
  echo "FAIL: restored database does not match the source" >&2
  diff <(printf '%s\n' "$SOURCE_COUNTS") <(printf '%s\n' "$RESTORED_COUNTS") >&2 || true
  exit 1
fi

TABLES=$(printf '%s\n' "$SOURCE_COUNTS" | wc -l)
ROWS=$(printf '%s\n' "$SOURCE_COUNTS" | cut -d= -f2 | paste -sd+ | bc)
echo "PASS: $TABLES tables, $ROWS rows restored identically."
