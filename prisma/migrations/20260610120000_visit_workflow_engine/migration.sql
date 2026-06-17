-- CreateEnum (idempotent — partial apply may have created this already)
DO $$ BEGIN
  CREATE TYPE "ApprovalMode" AS ENUM ('simple', 'workflow');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'PENDING_PRE_APPROVAL';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'PENDING_CHECKIN_APPROVAL';

-- AlterTable
ALTER TABLE "organization_settings"
ADD COLUMN IF NOT EXISTS "require_pre_visit_approval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "require_checkin_approval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "approval_mode" "ApprovalMode" NOT NULL DEFAULT 'simple';

-- Backfill org policy from legacy requiresApproval (Prisma camelCase column name)
UPDATE "organization_settings"
SET "require_pre_visit_approval" = true
WHERE "requiresApproval" = true AND "require_pre_visit_approval" = false;

-- Migrate legacy visit statuses
UPDATE "visits" SET "status" = 'PENDING_PRE_APPROVAL' WHERE "status" = 'PENDING';
UPDATE "visits" SET "status" = 'PENDING_CHECKIN_APPROVAL' WHERE "status" = 'AWAITING_APPROVAL';
