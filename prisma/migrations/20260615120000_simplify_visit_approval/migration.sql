-- Simplify visit approval: single PENDING/APPROVED gate, remove check-in approval settings.
-- Column names match live DB: requiresApproval (camelCase); legacy cols use @map snake_case.

-- Consolidate org approval flags into requiresApproval
UPDATE "organization_settings"
SET "requiresApproval" = (
  "requiresApproval"
  OR COALESCE("require_pre_visit_approval", false)
  OR COALESCE("require_checkin_approval", false)
);

-- Remap visit statuses before enum replacement
UPDATE "visits" SET "status" = 'PENDING' WHERE "status" = 'PENDING_PRE_APPROVAL';
UPDATE "visits" SET "status" = 'PENDING' WHERE "status" = 'AWAITING_APPROVAL';
UPDATE "visits" SET "status" = 'PENDING' WHERE "status" = 'DRAFT';
UPDATE "visits" SET "status" = 'APPROVED' WHERE "status" = 'SCHEDULED';
UPDATE "visits" SET "status" = 'APPROVED' WHERE "status" = 'PENDING_CHECKIN_APPROVAL';

-- Drop legacy org approval columns
ALTER TABLE "organization_settings" DROP COLUMN IF EXISTS "require_pre_visit_approval";
ALTER TABLE "organization_settings" DROP COLUMN IF EXISTS "require_checkin_approval";
ALTER TABLE "organization_settings" DROP COLUMN IF EXISTS "approval_mode";

DROP TYPE IF EXISTS "ApprovalMode";

-- Replace VisitStatus enum with simplified lifecycle values
ALTER TYPE "VisitStatus" RENAME TO "VisitStatus_old";

CREATE TYPE "VisitStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'CHECKED_IN',
  'CHECKED_OUT'
);

ALTER TABLE "visits" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "visits" ALTER COLUMN "status" TYPE "VisitStatus" USING (
  "status"::text::"VisitStatus"
);

ALTER TABLE "visits" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"VisitStatus";

DROP TYPE "VisitStatus_old";
