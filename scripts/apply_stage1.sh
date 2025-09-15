#!/usr/bin/env bash
set -euo pipefail

# One-click script: Stage 1 apply for freelancer-matching migration
# 1) Back up database (if pg_dump available)
# 2) Apply Stage 1 SQL (safe, additive)
# 3) Regenerate Prisma client
# 4) Run conflict checks

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set. Export it first, e.g. export DATABASE_URL=\"postgres://user:pass@host:5432/db\""
  exit 2
fi

echo "=== Starting Stage 1 apply: $(date) ==="

# 1) Backup (best-effort)
if command -v pg_dump >/dev/null 2>&1; then
  echo "Creating DB backup (pg_dump)..."
  BACKUP_FILE="prisma/backups/backup_$(date +%Y%m%d_%H%M%S).dump"
  mkdir -p prisma/backups
  pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_FILE"
  echo "Backup written to $BACKUP_FILE"
else
  echo "pg_dump not found; skipping DB backup. Ensure you have a DB backup before proceeding."
fi

# 2) Apply Stage 1 SQL
SQL_FILE="prisma/migrations/20250909_freelancer_matching_stepwise.sql"
if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: SQL file not found: $SQL_FILE"
  exit 3
fi

echo "Applying Stage 1 SQL: $SQL_FILE"
# Use psql if available, otherwise try using prisma db push as fallback
if command -v psql >/dev/null 2>&1; then
  PGPASSWORD="" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
else
  echo "psql not found. Attempting 'prisma db push' to sync datamodel (non-destructive)."
  npx prisma db push --accept-data-loss
fi

# 3) Regenerate prisma client
echo "Generating Prisma client..."
npx prisma generate

# 4) Run conflict checks
if command -v node >/dev/null 2>&1; then
  echo "Running conflict checks (node scripts/check_prisma_conflicts.mjs)"
  node scripts/check_prisma_conflicts.mjs || true
else
  echo "Node not found; skipping conflict checks. Run 'node scripts/check_prisma_conflicts.mjs' later."
fi

echo "=== Stage 1 apply complete ==="

echo "Next steps:
 - Inspect prisma/migrations/20250909_backfill_templates.sql and run the required backfill/ALTER steps when ready.
 - After backfill/verification, apply the Stage 2 ALTERs to add UNIQUE/NOT NULL constraints."
