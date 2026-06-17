-- Phase 7.3 — Organization request pipeline + platform admin role

ALTER TYPE "SystemRole" ADD VALUE 'PLATFORM_ADMIN';

CREATE TYPE "OrgRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "organization_requests" (
  "id" TEXT NOT NULL,
  "organizationName" VARCHAR(255) NOT NULL,
  "organizationEmail" VARCHAR(320) NOT NULL,
  "contactPerson" VARCHAR(255) NOT NULL,
  "contactEmail" VARCHAR(320) NOT NULL,
  "contactPhone" VARCHAR(50),
  "requestedPlan" VARCHAR(100),
  "status" "OrgRequestStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "approvalNotes" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdOrganizationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organization_requests_status_createdAt_idx" ON "organization_requests"("status", "createdAt");
CREATE INDEX "organization_requests_contactEmail_idx" ON "organization_requests"("contactEmail");
CREATE INDEX "organization_requests_organizationName_idx" ON "organization_requests"("organizationName");

ALTER TABLE "organization_requests"
  ADD CONSTRAINT "organization_requests_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
