import { prisma } from "@/lib/db/client";
import { ensureVisitQR } from "@/lib/services/qr.service";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { emitNotification } from "./projector";

function formatVisitorName(visitor: { firstName: string; lastName: string }) {
  return `${visitor.firstName} ${visitor.lastName}`.trim();
}

async function hasVisitorInvitationBeenSent(
  ctx: TenantContext,
  visitId: string,
  toEmail: string,
) {
  const existing = await prisma.emailDeliveryLog.findFirst({
    where: {
      organizationId: ctx.organizationId,
      visitId,
      emailType: "VISITOR_APPROVED",
      toEmail: toEmail.toLowerCase(),
      status: "sent",
    },
    select: { id: true },
  });

  return Boolean(existing);
}

/**
 * Sends the visitor invitation email (with embedded QR) when a visit becomes APPROVED.
 * Reuses the existing VISIT_APPROVED → VISITOR_APPROVED transactional email pipeline.
 */
export async function sendVisitInvitation(
  ctx: TenantContext,
  visitId: string,
) {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, organizationId: ctx.organizationId },
    select: {
      id: true,
      visitorId: true,
      visitor: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  const visitorEmail = visit?.visitor.email?.trim();
  if (!visit || !visitorEmail) {
    return;
  }

  if (await hasVisitorInvitationBeenSent(ctx, visitId, visitorEmail)) {
    return;
  }

  await ensureVisitQR(ctx, visitId);

  emitNotification(ctx, {
    kind: "VISIT_APPROVED",
    visitId: visit.id,
    visitorId: visit.visitorId,
    visitorName: formatVisitorName(visit.visitor),
    actorId: ctx.userId,
  });
}
