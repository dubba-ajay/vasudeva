-- Migration: add reviews table
-- Note: Run `prisma migrate deploy` or `prisma migrate dev` locally to apply this migration.

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "storeId" TEXT NOT NULL,
  "userId" TEXT,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "body" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Review_storeId_idx" ON "Review" ("storeId");
