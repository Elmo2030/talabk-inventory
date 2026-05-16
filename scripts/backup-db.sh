#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Manual Supabase backup script — for use while on the Free plan
# (where PITR / daily auto-backups aren't included).
#
# Usage:
#   export SUPABASE_DB_URL='postgresql://postgres:PASSWORD@db.PROJECTREF.supabase.co:5432/postgres'
#   ./scripts/backup-db.sh
#
# Outputs a timestamped .sql.gz file in ./backups/
# Recommended: run daily via macOS launchd / Linux cron / GitHub Actions.
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  echo "Set it to the direct connection string from Supabase dashboard:" >&2
  echo "  Project Settings → Database → Connection string → URI" >&2
  exit 1
fi

if ! command -v pg_dump &> /dev/null; then
  echo "ERROR: pg_dump not found. Install PostgreSQL client tools:" >&2
  echo "  macOS:  brew install libpq && brew link --force libpq" >&2
  echo "  Ubuntu: sudo apt-get install postgresql-client" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
OUT_FILE="$BACKUP_DIR/talabk_${TIMESTAMP}.sql.gz"

echo "Backing up Supabase DB → $OUT_FILE"
pg_dump \
  --no-owner \
  --no-privileges \
  --schema=public \
  --schema=auth \
  "$SUPABASE_DB_URL" \
  | gzip > "$OUT_FILE"

SIZE=$(du -h "$OUT_FILE" | cut -f1)
echo "✓ Done. Backup size: $SIZE"

# Optional: prune backups older than 30 days
find "$BACKUP_DIR" -name "talabk_*.sql.gz" -type f -mtime +30 -delete 2>/dev/null || true

echo ""
echo "To restore:"
echo "  gunzip < $OUT_FILE | psql \"\$SUPABASE_DB_URL\""
