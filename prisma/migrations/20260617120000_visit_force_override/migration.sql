-- AlterTable
ALTER TABLE "visits" ADD COLUMN "checkedInById" TEXT,
ADD COLUMN "checkedOutById" TEXT;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
