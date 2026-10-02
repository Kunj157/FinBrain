#!/usr/bin/env bash
#
# Restore a FinBrain database dump.
#
# This is the counterpart to the db-backup service in docker-compose.prod.yml.
# A dump nobody has ever restored is not a backup, so scripts/verify-backup.sh
# exercises this script end to end against a scratch database.
#
# Usage:
#   scripts/restore-db.sh <dump-file> <target-database-url>
#
# The dump may be plain SQL (.sql), gzipped plain SQL (.sql.gz) or pg_dump's
# custom format (.dump).

set -euo pipefail

DUMP_FILE=${1:-}
TARGET_URL=${2:-${DATABASE_URL:-}}

if [[ -z "$DUMP_FILE" || -z "$TARGET_URL" ]]; then
  echo "usage: $0 <dump-file> <target-database-url>" >&2
  exit 2
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "error: no such dump file: $DUMP_FILE" >&2
  exit 1
fi

# Restoring overwrites every row in the target. Naming the database back is the
# one guard against pointing this at production while meaning to use a scratch
# copy, so it is required even in scripts -- set RESTORE_CONFIRM to automate.
TARGET_DB=$(printf '%s' "$TARGET_URL" | sed -E 's#^.*/([^/?]+)(\?.*)?$#\1#')
CONFIRM=${RESTORE_CONFIRM:-}

if [[ -z "$CONFIRM" ]]; then
  echo "This will REPLACE the contents of database '$TARGET_DB'."
  read -r -p "Type the database name to continue: " CONFIRM
fi

if [[ "$CONFIRM" != "$TARGET_DB" ]]; then
  echo "error: confirmation '$CONFIRM' does not match target database '$TARGET_DB'; aborting" >&2
  exit 1
fi

echo "==> Restoring $DUMP_FILE into $TARGET_DB"

case "$DUMP_FILE" in
  *.dump)
    # --clean --if-exists so a restore over an existing database replaces it
    # rather than failing on every duplicate object.
    pg_restore --clean --if-exists --no-owner --no-privileges \
      --dbname "$TARGET_URL" "$DUMP_FILE"
    ;;
  *.sql.gz)
    gunzip -c "$DUMP_FILE" | psql --quiet --set ON_ERROR_STOP=on --dbname "$TARGET_URL"
    ;;
  *.sql)
    psql --quiet --set ON_ERROR_STOP=on --dbname "$TARGET_URL" --file "$DUMP_FILE"
    ;;
  *)
    echo "error: unrecognised dump format: $DUMP_FILE" >&2
    exit 1
    ;;
esac

echo "==> Restore complete."
echo "    Run 'pnpm --filter @finbrain/api exec prisma migrate status' to confirm"
echo "    the restored schema matches the migration history."
