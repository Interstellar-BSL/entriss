-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastActiveOrganizationId" TEXT;

-- CreateIndex
CREATE INDEX "users_systemRole_idx" ON "users"("systemRole");
