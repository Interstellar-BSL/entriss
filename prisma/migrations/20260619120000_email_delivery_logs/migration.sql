-- CreateTable
CREATE TABLE "email_delivery_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "emailType" VARCHAR(100) NOT NULL,
    "visitId" TEXT,
    "toEmail" VARCHAR(320) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_failure_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "emailType" VARCHAR(100) NOT NULL,
    "toEmail" VARCHAR(320) NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_failure_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_delivery_logs_idempotencyKey_key" ON "email_delivery_logs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "email_delivery_logs_organizationId_visitId_idx" ON "email_delivery_logs"("organizationId", "visitId");

-- CreateIndex
CREATE INDEX "email_delivery_logs_organizationId_emailType_createdAt_idx" ON "email_delivery_logs"("organizationId", "emailType", "createdAt");

-- CreateIndex
CREATE INDEX "email_failure_logs_organizationId_createdAt_idx" ON "email_failure_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "email_failure_logs_idempotencyKey_idx" ON "email_failure_logs"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "email_delivery_logs" ADD CONSTRAINT "email_delivery_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_failure_logs" ADD CONSTRAINT "email_failure_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
