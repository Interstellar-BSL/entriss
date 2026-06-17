-- Phase 7.1 — Organization lifecycle: PENDING | APPROVED | REJECTED | SUSPENDED

CREATE TYPE "OrgStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

ALTER TABLE "organizations" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "organizations"
  ALTER COLUMN "status" TYPE "OrgStatus_new"
  USING (
    CASE "status"::text
      WHEN 'ACTIVE' THEN 'APPROVED'::"OrgStatus_new"
      WHEN 'SUSPENDED' THEN 'SUSPENDED'::"OrgStatus_new"
      ELSE 'PENDING'::"OrgStatus_new"
    END
  );

DROP TYPE "OrgStatus";

ALTER TYPE "OrgStatus_new" RENAME TO "OrgStatus";

ALTER TABLE "organizations" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Bootstrap / demo tenants remain operational
UPDATE "organizations"
SET "status" = 'APPROVED'
WHERE "id" = 'default-org' OR "slug" = 'default-org';

UPDATE "organizations"
SET "status" = 'APPROVED'
WHERE "slug" = 'demo-org';
