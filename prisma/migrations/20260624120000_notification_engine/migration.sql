-- Phase 6.9: Enterprise notification engine (queue, DLQ, delivery tracking)

ALTER TABLE "app_notifications"
  ADD COLUMN IF NOT EXISTS "deliveryStatus" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "channelUsed" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "providerResponse" TEXT,
  ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deliveryKey" VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS "app_notifications_deliveryKey_key"
  ON "app_notifications"("deliveryKey");

CREATE TABLE IF NOT EXISTS "notification_jobs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "channelTypes" JSONB NOT NULL,
  "recipients" JSONB NOT NULL,
  "payload" JSONB NOT NULL,
  "status" VARCHAR(32) NOT NULL,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "maxRetries" INTEGER NOT NULL DEFAULT 5,
  "nextRetryAt" TIMESTAMP(3),
  "lastError" TEXT,
  "idempotencyKey" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_jobs_idempotencyKey_key"
  ON "notification_jobs"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "notification_jobs_status_nextRetryAt_idx"
  ON "notification_jobs"("status", "nextRetryAt");

CREATE INDEX IF NOT EXISTS "notification_jobs_organizationId_createdAt_idx"
  ON "notification_jobs"("organizationId", "createdAt");

ALTER TABLE "notification_jobs"
  ADD CONSTRAINT "notification_jobs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "notification_dlq" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "channelTypes" JSONB NOT NULL,
  "recipients" JSONB NOT NULL,
  "payload" JSONB NOT NULL,
  "retryCount" INTEGER NOT NULL,
  "lastError" TEXT NOT NULL,
  "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_dlq_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_dlq_jobId_key"
  ON "notification_dlq"("jobId");

CREATE INDEX IF NOT EXISTS "notification_dlq_organizationId_failedAt_idx"
  ON "notification_dlq"("organizationId", "failedAt");

ALTER TABLE "notification_dlq"
  ADD CONSTRAINT "notification_dlq_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
