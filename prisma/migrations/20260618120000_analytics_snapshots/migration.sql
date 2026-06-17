-- CreateEnum
CREATE TYPE "AnalyticsSnapshotType" AS ENUM ('dashboard', 'branch', 'host', 'audit');

-- CreateEnum
CREATE TYPE "AnalyticsSnapshotPeriod" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "AnalyticsSnapshotType" NOT NULL,
    "period" "AnalyticsSnapshotPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_snapshots_organizationId_type_period_periodStart_idx" ON "analytics_snapshots"("organizationId", "type", "period", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_organizationId_type_period_periodStart_key" ON "analytics_snapshots"("organizationId", "type", "period", "periodStart");

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
