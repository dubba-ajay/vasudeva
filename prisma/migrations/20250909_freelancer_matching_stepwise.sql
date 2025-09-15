-- Stepwise migration: Stage 1 (safe, additive)
-- Run Stage 1 to create tables and non-breaking indexes/constraints.

CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT,
  "ownerEmail" TEXT,
  "gateway" TEXT,
  "gatewayAccount" TEXT,
  "kycStatus" TEXT DEFAULT 'pending',
  "bankIfsc" TEXT,
  "bankAccount" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CommissionRule" (
  "id" TEXT PRIMARY KEY,
  "scopeType" TEXT,
  "scopeId" TEXT,
  "storePct" INTEGER,
  "freelancerPct" INTEGER,
  "platformPct" INTEGER,
  "priority" INTEGER,
  "active" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT PRIMARY KEY,
  "bookingId" TEXT,
  "storeId" TEXT,
  "freelancerId" TEXT,
  "amount" INTEGER,
  "tax" INTEGER,
  "total" INTEGER,
  "currency" TEXT,
  "gateway" TEXT,
  "gatewayRef" TEXT,
  "status" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Escrow" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT,
  "status" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT,
  "payeeType" TEXT,
  "payeeAccount" TEXT,
  "amount" INTEGER,
  "status" TEXT,
  "gatewayRef" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Refund" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT,
  "amount" INTEGER,
  "reason" TEXT,
  "status" TEXT,
  "gatewayRef" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "WebhookLog" (
  "id" TEXT PRIMARY KEY,
  "gateway" TEXT,
  "event" TEXT,
  "signature" TEXT,
  "valid" BOOLEAN,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT,
  "pdfUrl" TEXT,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT,
  "phone" TEXT,
  "name" TEXT,
  "role" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Store" (
  "id" TEXT PRIMARY KEY,
  "ownerUserId" TEXT,
  "name" TEXT,
  "description" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "city" TEXT,
  "region" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "serviceRadiusMeters" INTEGER,
  "autoAssignEnabled" BOOLEAN DEFAULT false,
  "claimWindowSeconds" INTEGER DEFAULT 300,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Service" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT,
  "name" TEXT,
  "defaultDurationMin" INTEGER DEFAULT 60,
  "defaultPriceCents" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "StoreService" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT,
  "serviceId" TEXT,
  "enabled" BOOLEAN DEFAULT true,
  "priceCents" INTEGER,
  "durationMin" INTEGER
);

CREATE TABLE IF NOT EXISTS "Skill" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT,
  "name" TEXT
);

CREATE TABLE IF NOT EXISTS "Freelancer" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "name" TEXT,
  "bio" TEXT,
  "rating" DOUBLE PRECISION DEFAULT 0,
  "homeRadiusMeters" INTEGER,
  "locationLat" DOUBLE PRECISION,
  "locationLng" DOUBLE PRECISION,
  "workMode" TEXT DEFAULT 'both',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FreelancerSkill" (
  "id" TEXT PRIMARY KEY,
  "freelancerId" TEXT,
  "skillId" TEXT
);

CREATE TABLE IF NOT EXISTS "FreelancerStore" (
  "id" TEXT PRIMARY KEY,
  "freelancerId" TEXT,
  "storeId" TEXT,
  "approved" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Availability" (
  "id" TEXT PRIMARY KEY,
  "freelancerId" TEXT,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Booking" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT,
  "serviceId" TEXT,
  "customerUserId" TEXT,
  "locationLat" DOUBLE PRECISION,
  "locationLng" DOUBLE PRECISION,
  "locationAddr" TEXT,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "durationMin" INTEGER,
  "priceCents" INTEGER,
  "locationType" TEXT,
  "allowClaim" BOOLEAN DEFAULT false,
  "status" TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BookingAssignment" (
  "id" TEXT PRIMARY KEY,
  "bookingId" TEXT,
  "freelancerId" TEXT,
  "status" TEXT,
  "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "note" TEXT
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "role" TEXT,
  "type" TEXT,
  "payload" JSONB,
  "read" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SlotLock" (
  "id" TEXT PRIMARY KEY,
  "freelancerId" TEXT,
  "bookingId" TEXT,
  "date" TIMESTAMP(3),
  "startTime" TEXT,
  "endTime" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuthCredential" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT,
  "passwordHash" TEXT,
  "salt" TEXT,
  "role" TEXT,
  "userId" TEXT,
  "mustReset" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Stage 1 indexes (non-unique to avoid migration failures on existing data)
CREATE INDEX IF NOT EXISTS "Availability_freelancerId_startAt_endAt_idx" ON "Availability"("freelancerId", "startAt", "endAt");
CREATE INDEX IF NOT EXISTS "Booking_storeId_status_idx" ON "Booking"("storeId", "status");
CREATE INDEX IF NOT EXISTS "Booking_startAt_endAt_idx" ON "Booking"("startAt", "endAt");
CREATE INDEX IF NOT EXISTS "BookingAssignment_bookingId_idx" ON "BookingAssignment"("bookingId");
CREATE INDEX IF NOT EXISTS "BookingAssignment_freelancerId_idx" ON "BookingAssignment"("freelancerId");
CREATE INDEX IF NOT EXISTS "SlotLock_freelancerId_date_idx" ON "SlotLock"("freelancerId", "date");

-- Stage 2 (run AFTER backfill & verification)
-- Add unique constraints and NOT NULL constraints that we intentionally deferred.
-- Example ALTER statements below should be executed after ensuring no conflicting duplicates exist and necessary backfill is complete.

/*
ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");
ALTER TABLE "User" ADD CONSTRAINT "User_phone_key" UNIQUE ("phone");
ALTER TABLE "Service" ADD CONSTRAINT "Service_code_key" UNIQUE ("code");
ALTER TABLE "Freelancer" ADD CONSTRAINT "Freelancer_userId_key" UNIQUE ("userId");
ALTER TABLE "FreelancerSkill" ADD CONSTRAINT "FreelancerSkill_freelancerId_skillId_key" UNIQUE ("freelancerId", "skillId");
ALTER TABLE "FreelancerStore" ADD CONSTRAINT "FreelancerStore_freelancerId_storeId_key" UNIQUE ("freelancerId", "storeId");
ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_bookingId_freelancerId_key" UNIQUE ("bookingId", "freelancerId");

-- Example: make updatedAt NOT NULL with default already set in Stage 1; other NOT NULL transitions:
ALTER TABLE "Freelancer" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "updatedAt" SET NOT NULL;
*/
