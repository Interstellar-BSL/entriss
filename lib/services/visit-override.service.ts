import { VisitStatus } from "@/app/generated/prisma/enums";
import { invalidateAnalyticsOnOverride } from "@/lib/analytics/cache/cache-invalidation";
import { emitNotification, projectVisitStatusNotification } from "@/lib/notifications/projector";
import { triggerSnapshotRebuild } from "@/lib/analytics/snapshots/snapshot-rebuild";
import { writeAuditLog } from "@/lib/audit/logger";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { ServiceError, VisitNotFoundError } from "./errors";
import { visitInclude } from "./internal/visit-include";

export interface ForceVisitOverrideInput {
  reason: string;
  note?: string;
}

const FORCE_CHECKIN_BLOCKED_STATUSES = new Set<VisitStatus>([
  VisitStatus.CHECKED_IN,
  VisitStatus.CHECKED_OUT,
  VisitStatus.CANCELLED,
  VisitStatus.REJECTED,
]);

function tenantVisitWhere(ctx: TenantContext, visitId: string) {
  return {
    organizationId: ctx.organizationId,
    id: visitId,
  } as const;
}

export async function forceVisitCheckIn(
  ctx: TenantContext,
  visitId: string,
  payload: ForceVisitOverrideInput,
) {
  requirePermission(ctx, PERMISSIONS.VISIT_FORCE_CHECKIN);

  const existing = await prisma.visit.findFirst({
    where: tenantVisitWhere(ctx, visitId),
    include: visitInclude,
  });

  if (!existing) {
    throw new VisitNotFoundError(visitId);
  }

  const previousStatus = existing.status;

  if (previousStatus === VisitStatus.CHECKED_IN) {
    throw new ServiceError(
      "VISIT_ALREADY_CHECKED_IN",
      "Visit is already checked in",
    );
  }

  if (previousStatus === VisitStatus.CHECKED_OUT) {
    throw new ServiceError(
      "VISIT_ALREADY_CHECKED_OUT",
      "Visit has already been checked out",
    );
  }

  if (FORCE_CHECKIN_BLOCKED_STATUSES.has(previousStatus)) {
    throw new ServiceError(
      "VISIT_CANNOT_FORCE_CHECKIN",
      `Cannot force check-in from status ${previousStatus}`,
    );
  }

  const now = new Date();

  const visit = await prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: {
        id: existing.id,
        organizationId: ctx.organizationId,
      },
      data: {
        status: VisitStatus.CHECKED_IN,
        checkedInAt: now,
        checkedInById: ctx.userId,
      },
      include: visitInclude,
    });

    await tx.visitEvent.create({
      data: {
        organizationId: ctx.organizationId,
        visitId: updated.id,
        type: "visit.force_check_in",
        actorId: ctx.userId,
        payload: {
          reason: payload.reason,
          note: payload.note ?? null,
          previousStatus,
          forced: true,
        },
      },
    });

    return updated;
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "FORCE_CHECKIN",
    resourceType: "Visit",
    resourceId: visit.id,
    metadata: {
      reason: payload.reason,
      note: payload.note ?? null,
      previousStatus,
      actorId: ctx.userId,
      visitorId: visit.visitorId,
    },
  });

  invalidateAnalyticsOnOverride(ctx.organizationId);
  triggerSnapshotRebuild(ctx.organizationId);

  void projectVisitStatusNotification(ctx, {
    visitId: visit.id,
    previousStatus,
    nextStatus: VisitStatus.CHECKED_IN,
    forced: true,
  }).catch((error) => {
    console.error("[notifications] force check-in projection failed", error);
  });

  const visitorName = `${visit.visitor.firstName} ${visit.visitor.lastName}`.trim();
  emitNotification(ctx, {
    kind: "SECURITY_OVERRIDE",
    visitId: visit.id,
    visitorId: visit.visitorId,
    visitorName,
    action: "FORCE_CHECKIN",
    actorId: ctx.userId,
  });

  return visit;
}

export async function forceVisitCheckOut(
  ctx: TenantContext,
  visitId: string,
  payload: ForceVisitOverrideInput,
) {
  requirePermission(ctx, PERMISSIONS.VISIT_FORCE_CHECKOUT);

  const existing = await prisma.visit.findFirst({
    where: tenantVisitWhere(ctx, visitId),
    include: visitInclude,
  });

  if (!existing) {
    throw new VisitNotFoundError(visitId);
  }

  const previousStatus = existing.status;

  if (previousStatus !== VisitStatus.CHECKED_IN) {
    throw new ServiceError(
      "VISIT_NOT_CHECKED_IN",
      "Force check-out is only allowed for checked-in visits",
    );
  }

  const now = new Date();

  const visit = await prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: {
        id: existing.id,
        organizationId: ctx.organizationId,
      },
      data: {
        status: VisitStatus.CHECKED_OUT,
        checkedOutAt: now,
        checkedOutById: ctx.userId,
      },
      include: visitInclude,
    });

    await tx.visitEvent.create({
      data: {
        organizationId: ctx.organizationId,
        visitId: updated.id,
        type: "visit.force_check_out",
        actorId: ctx.userId,
        payload: {
          reason: payload.reason,
          note: payload.note ?? null,
          previousStatus,
          forced: true,
        },
      },
    });

    return updated;
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "FORCE_CHECKOUT",
    resourceType: "Visit",
    resourceId: visit.id,
    metadata: {
      reason: payload.reason,
      note: payload.note ?? null,
      previousStatus,
      actorId: ctx.userId,
      visitorId: visit.visitorId,
    },
  });

  invalidateAnalyticsOnOverride(ctx.organizationId);
  triggerSnapshotRebuild(ctx.organizationId);

  void projectVisitStatusNotification(ctx, {
    visitId: visit.id,
    previousStatus,
    nextStatus: VisitStatus.CHECKED_OUT,
    forced: true,
  }).catch((error) => {
    console.error("[notifications] force check-out projection failed", error);
  });

  const visitorName = `${visit.visitor.firstName} ${visit.visitor.lastName}`.trim();
  emitNotification(ctx, {
    kind: "SECURITY_OVERRIDE",
    visitId: visit.id,
    visitorId: visit.visitorId,
    visitorName,
    action: "FORCE_CHECKOUT",
    actorId: ctx.userId,
  });

  return visit;
}

export async function countManualOverridesToday(ctx: TenantContext): Promise<{
  forceCheckIns: number;
  forceCheckOuts: number;
  total: number;
} | null> {
  const canView =
    ctx.isSystemOwner ||
    ctx.permissions.includes(PERMISSIONS.VISIT_FORCE_CHECKIN) ||
    ctx.permissions.includes(PERMISSIONS.VISIT_FORCE_CHECKOUT);

  if (!canView) {
    return null;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [forceCheckIns, forceCheckOuts] = await Promise.all([
    prisma.auditLog.count({
      where: {
        organizationId: ctx.organizationId,
        action: "FORCE_CHECKIN",
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.auditLog.count({
      where: {
        organizationId: ctx.organizationId,
        action: "FORCE_CHECKOUT",
        createdAt: { gte: start, lte: end },
      },
    }),
  ]);

  return {
    forceCheckIns,
    forceCheckOuts,
    total: forceCheckIns + forceCheckOuts,
  };
}
