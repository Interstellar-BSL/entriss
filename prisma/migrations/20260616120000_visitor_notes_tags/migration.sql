-- AlterTable
ALTER TABLE "visitors" ADD COLUMN "visitorTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "visitor_notes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_notes_organizationId_visitorId_createdAt_idx" ON "visitor_notes"("organizationId", "visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "visitor_notes_visitorId_idx" ON "visitor_notes"("visitorId");

-- AddForeignKey
ALTER TABLE "visitor_notes" ADD CONSTRAINT "visitor_notes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_notes" ADD CONSTRAINT "visitor_notes_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_notes" ADD CONSTRAINT "visitor_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_notes" ADD CONSTRAINT "visitor_notes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
