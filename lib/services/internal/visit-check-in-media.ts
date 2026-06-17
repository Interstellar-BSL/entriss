import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import {
  extractCheckInMediaFromVisit,
  normalizeCapturedDocuments,
  type PersistCheckInCaptureInput,
  type VisitCapturedDocumentRecord,
  type VisitCheckInMediaRecord,
} from "@/lib/visits/check-in-media";

import { recordVisitEvent } from "./visit-events";

export type {
  PersistCheckInCaptureInput,
  VisitCapturedDocumentRecord,
  VisitCheckInMediaRecord,
};

export { extractCheckInMediaFromVisit };

export async function persistCheckInCapture(
  ctx: TenantContext,
  visit: { id: string; visitorId: string },
  input: PersistCheckInCaptureInput,
) {
  const photoUrl = input.photoUrl?.trim() ? input.photoUrl.trim() : null;
  const documents = normalizeCapturedDocuments(input.documents ?? []);

  if (!photoUrl && documents.length === 0) {
    return;
  }

  if (photoUrl) {
    await prisma.visitor.update({
      where: {
        id: visit.visitorId,
        organizationId: ctx.organizationId,
      },
      data: { photoUrl },
    });
  }

  await recordVisitEvent(
    ctx.organizationId,
    visit.id,
    "check_in.capture",
    {
      photoUrl,
      documents,
    } as unknown as Prisma.InputJsonValue,
    ctx.userId,
  );
}
