import { VisitStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { mapEventToNotifications } from "./event-mapper";
import { enqueueNotificationJobs } from "./queue/producer";
import { enqueueNotificationJob } from "./async-job-runner";
import type { NotificationDomainEvent } from "./types";

export function emitNotification(
  ctx: TenantContext,
  event: NotificationDomainEvent,
) {
  enqueueNotificationJob(async () => {
    const payloads = await mapEventToNotifications(ctx, event);
    await enqueueNotificationJobs(ctx, event, payloads);
  });
}

function formatVisitorName(visitor: {
  firstName: string;
  lastName: string;
}) {
  return `${visitor.firstName} ${visitor.lastName}`.trim();
}

export async function projectVisitStatusNotification(
  ctx: TenantContext,
  input: {
    visitId: string;
    previousStatus: VisitStatus;
    nextStatus: VisitStatus;
    cancelReason?: string | null;
    forced?: boolean;
  },
) {
  const visit = await prisma.visit.findFirst({
    where: { id: input.visitId, organizationId: ctx.organizationId },
    include: {
      visitor: { select: { id: true, firstName: true, lastName: true } },
      host: { select: { userId: true } },
    },
  });

  if (!visit) {
    return;
  }

  const visitorName = formatVisitorName(visit.visitor);

  if (input.nextStatus === VisitStatus.CHECKED_IN) {
    emitNotification(ctx, {
      kind: "VISITOR_ARRIVED",
      visitId: visit.id,
      visitorId: visit.visitorId,
      branchId: visit.branchId,
      hostUserId: visit.host.userId,
      visitorName,
      forced: input.forced,
    });
    return;
  }

  if (input.nextStatus === VisitStatus.CHECKED_OUT) {
    emitNotification(ctx, {
      kind: "VISIT_COMPLETED",
      visitId: visit.id,
      visitorId: visit.visitorId,
      hostUserId: visit.host.userId,
      visitorName,
    });
    return;
  }

  if (input.nextStatus === VisitStatus.CANCELLED) {
    emitNotification(ctx, {
      kind: "VISIT_CANCELLED",
      visitId: visit.id,
      visitorId: visit.visitorId,
      visitorName,
      actorId: ctx.userId,
      reason: input.cancelReason ?? undefined,
    });
  }
}

export async function projectApprovalReminderNotifications(ctx: TenantContext) {
  const threshold = new Date(Date.now() - 15 * 60 * 1000);

  const pendingVisits = await prisma.visit.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: VisitStatus.PENDING,
      createdAt: { lte: threshold },
    },
    include: {
      visitor: { select: { id: true, firstName: true, lastName: true } },
    },
    take: 25,
  });

  if (pendingVisits.length === 0) {
    return;
  }

  const visitIds = pendingVisits.map((visit) => visit.id);
  const recentReminders = await prisma.appNotification.findMany({
    where: {
      organizationId: ctx.organizationId,
      type: "APPROVAL_REMINDER",
      resourceType: "Visit",
      resourceId: { in: visitIds },
      createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
    },
    select: { resourceId: true },
  });

  const remindedVisitIds = new Set(recentReminders.map((row) => row.resourceId));

  for (const visit of pendingVisits) {
    if (remindedVisitIds.has(visit.id)) {
      continue;
    }

    emitNotification(ctx, {
      kind: "APPROVAL_REMINDER",
      visitId: visit.id,
      visitorId: visit.visitorId,
      visitorName: formatVisitorName(visit.visitor),
    });
  }
}
