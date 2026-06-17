-- Phase 7.1 — Organization core model extensions (safe, additive)

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- Organization lifecycle
ALTER TABLE "organizations" ADD COLUMN "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE';
UPDATE "organizations"
SET "status" = CASE
  WHEN "isActive" = true AND "deletedAt" IS NULL THEN 'ACTIVE'::"OrgStatus"
  ELSE 'SUSPENDED'::"OrgStatus"
END;

CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- Membership lifecycle
ALTER TABLE "organization_members" ADD COLUMN "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE';
UPDATE "organization_members"
SET "status" = CASE
  WHEN "isActive" = true THEN 'ACTIVE'::"MemberStatus"
  ELSE 'DISABLED'::"MemberStatus"
END;

CREATE INDEX "organization_members_organizationId_status_idx" ON "organization_members"("organizationId", "status");

-- User SSO identity hook (optional)
ALTER TABLE "users" ADD COLUMN "authProviderId" VARCHAR(255);

-- System role templates may exist without a tenant (gradual migration path)
ALTER TABLE "roles" ALTER COLUMN "organizationId" DROP NOT NULL;

-- Notification category denormalization (optional column; app resolves when null)
ALTER TABLE "app_notifications" ADD COLUMN "category" VARCHAR(50);
CREATE INDEX "app_notifications_organizationId_category_idx" ON "app_notifications"("organizationId", "category");

-- Bootstrap backward-compatible default tenant (idempotent)
INSERT INTO "organizations" (
  "id",
  "name",
  "slug",
  "settings",
  "isActive",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  'default-org',
  'Default Organization',
  'default',
  '{}'::jsonb,
  true,
  'ACTIVE'::"OrgStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "organizations" WHERE "id" = 'default-org' OR "slug" = 'default'
);
