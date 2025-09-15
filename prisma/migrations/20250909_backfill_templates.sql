-- Backfill + Constraint application templates for freelancer-matching migration
-- Run these AFTER applying the Stage 1 migration (creating tables) and verifying data.
-- These templates assume tables exist (created by Stage 1) and are mostly no-ops on empty DB.

-- 1) Verify there are no duplicates for unique columns
-- (If these return rows, inspect and resolve manually before adding UNIQUE constraints)

-- Users: duplicate emails
SELECT email, array_agg(id) AS ids, count(*) AS cnt
FROM "User"
WHERE email IS NOT NULL
GROUP BY email
HAVING count(*) > 1;

-- Users: duplicate phones
SELECT phone, array_agg(id) AS ids, count(*) AS cnt
FROM "User"
WHERE phone IS NOT NULL
GROUP BY phone
HAVING count(*) > 1;

-- Services: duplicate codes
SELECT code, array_agg(id) AS ids, count(*) AS cnt
FROM "Service"
WHERE code IS NOT NULL
GROUP BY code
HAVING count(*) > 1;

-- Freelancers: duplicate userId
SELECT "userId", array_agg(id) AS ids, count(*) AS cnt
FROM "Freelancer"
WHERE "userId" IS NOT NULL
GROUP BY "userId"
HAVING count(*) > 1;

-- FreelancerSkill duplicates
SELECT "freelancerId","skillId", array_agg(id) AS ids, count(*) AS cnt
FROM "FreelancerSkill"
GROUP BY "freelancerId","skillId"
HAVING count(*) > 1;

-- FreelancerStore duplicates
SELECT "freelancerId","storeId", array_agg(id) AS ids, count(*) AS cnt
FROM "FreelancerStore"
GROUP BY "freelancerId","storeId"
HAVING count(*) > 1;

-- BookingAssignment duplicates
SELECT "bookingId","freelancerId", array_agg(id) AS ids, count(*) AS cnt
FROM "BookingAssignment"
GROUP BY "bookingId","freelancerId"
HAVING count(*) > 1;

-- 2) Safe deduplication templates (if duplicates exist)
-- These templates keep the lowest id row and nullify or mark duplicates for manual review.
-- WARNING: These are destructive. Always BACKUP or export rows to a review table before running.

-- Example: move duplicates to a review table and nullify duplicate emails (keep earliest id)
CREATE TABLE IF NOT EXISTS migration_dedup_user_email AS
SELECT email, array_agg(id) AS ids, min(id) AS keep_id, (array_agg(id) - min(id)) AS dup_ids
FROM "User"
WHERE email IS NOT NULL
GROUP BY email
HAVING count(*) > 1;

-- Move duplicate rows to a safe review table
CREATE TABLE IF NOT EXISTS migration_user_email_review AS TABLE "User" WITH NO DATA;

-- Insert duplicates (excluding the keep_id) into review table
INSERT INTO migration_user_email_review
SELECT u.* FROM "User" u
JOIN migration_dedup_user_email d ON u.email = d.email
WHERE u.id = ANY(d.dup_ids::text[]);

-- Nullify duplicate emails in original table (so unique constraint can be added)
UPDATE "User" u SET email = NULL
FROM migration_dedup_user_email d
WHERE u.email = d.email AND u.id = ANY(d.dup_ids::text[]);

-- Repeat analogous steps for phone, service.code, freelancer.userId, etc.

-- 3) Apply unique constraints and NOT NULL constraints (Stage 2)
-- Only run these AFTER verifying no conflicts remain.

ALTER TABLE "User" ADD CONSTRAINT IF NOT EXISTS "User_email_key" UNIQUE ("email");
ALTER TABLE "User" ADD CONSTRAINT IF NOT EXISTS "User_phone_key" UNIQUE ("phone");
ALTER TABLE "Service" ADD CONSTRAINT IF NOT EXISTS "Service_code_key" UNIQUE ("code");
ALTER TABLE "Freelancer" ADD CONSTRAINT IF NOT EXISTS "Freelancer_userId_key" UNIQUE ("userId");
ALTER TABLE "FreelancerSkill" ADD CONSTRAINT IF NOT EXISTS "FreelancerSkill_freelancerId_skillId_key" UNIQUE ("freelancerId", "skillId");
ALTER TABLE "FreelancerStore" ADD CONSTRAINT IF NOT EXISTS "FreelancerStore_freelancerId_storeId_key" UNIQUE ("freelancerId", "storeId");
ALTER TABLE "BookingAssignment" ADD CONSTRAINT IF NOT EXISTS "BookingAssignment_bookingId_freelancerId_key" UNIQUE ("bookingId", "freelancerId");

-- Ensure updatedAt columns are NOT NULL (Stage 1 created them with DEFAULT CURRENT_TIMESTAMP)
ALTER TABLE "Freelancer" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Store" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "AuthCredential" ALTER COLUMN "updatedAt" SET NOT NULL;

-- 4) Optional: Backfill placeholders for required fields (adopt policies per your org)
-- Example: ensure Service.code is not null by setting a placeholder code based on id when missing
UPDATE "Service" SET code = 'service_' || substring(id from 1 for 8) WHERE code IS NULL;

-- Example: ensure Freelancer.userId uniqueness and non-null if you want to link users
-- If you want to require userId, first create dummy user rows for freelancers that lack a user linkage or decide mapping strategy.

-- 5) Verification queries after applying constraints
SELECT COUNT(*) AS total_users FROM "User";
SELECT COUNT(*) AS users_with_email FROM "User" WHERE email IS NOT NULL;
SELECT COUNT(*) AS users_with_phone FROM "User" WHERE phone IS NOT NULL;
SELECT COUNT(*) AS services FROM "Service";

-- End of backfill templates
