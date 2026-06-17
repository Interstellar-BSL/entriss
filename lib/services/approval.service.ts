import type { Visit } from "@/app/generated/prisma/client";
import {
  ApprovalDecision,
  ApprovalStatus,
  VisitStatus,
} from "@/app/generated/prisma/enums";
import { writeAuditLog } from "@/lib/audit/logger";
import { invalidateAnalyticsOnApprovalUpdate } from "@/lib/analytics/cache/cache-invalidation";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { hasPermission, requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import {
  isVisitPendingApproval,
} from "@/lib/visits/workflow-engine";

import { ServiceError, VisitNotFoundError } from "./errors";
import { visitInclude } from "./internal/visit-include";
import { emitNotification } from "@/lib/notifications/projector";
import { sendVisitInvitation } from "@/lib/notifications/visit-invitation";
import { getVisitById } from "./visit.service";
import { assertVisitTransition } from "./visit-transitions";

export type ApprovalQueueTab = "pending" | "approved" | "rejected";

function tenantVisitWhere(ctx: TenantContext, visitId?: string) {
  return {
    organizationId: ctx.organizationId,
    ...(visitId ? { id: visitId } : {}),
  } as const;
}

function canApproveVisit(ctx: TenantContext): boolean {
  return (
    hasPermission(ctx, PERMISSIONS.VISIT_APPROVE_PRE_VISIT) ||
    hasPermission(ctx, PERMISSIONS.VISIT_APPROVE)
  );
}

function canRejectVisit(ctx: TenantContext): boolean {
  return hasPermission(ctx, PERMISSIONS.VISIT_REJECT);
}

async function resolveApproverUserIds(
  ctx: TenantContext,
  visit: Pick<Visit, "branchId" | "hostMemberId">,
): Promise<string[]> {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: ctx.organizationId,
      isActive: true,
      OR: [
        { id: visit.hostMemberId },
        {
          role: {
            permissions: {
              some: {
                permission: {
                  slug: {
                    in: [
                      PERMISSIONS.VISIT_APPROVE_PRE_VISIT,
                      PERMISSIONS.VISIT_APPROVE,
                      PERMISSIONS.BRANCH_MANAGE,
                      PERMISSIONS.USER_MANAGE,
                    ],
                  },
                },
              },
            },
          },
        },
      ],
    },
    select: { userId: true },
  });

  return [...new Set(members.map((member) => member.userId))];
}

async function upsertPendingVisitApproval(
  ctx: TenantContext,
  visitId: string,
  approverMemberId: string,
) {
  const existing = await prisma.visitApproval.findFirst({
    where: {
      organizationId: ctx.organizationId,
      visitId,
      status: ApprovalStatus.PENDING,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.visitApproval.create({
    data: {
      organizationId: ctx.organizationId,
      visitId,
      approverMemberId,
      status: ApprovalStatus.PENDING,
    },
  });
}

async function finalizeVisitApproval(
  ctx: TenantContext,
  visitId: string,
  decision: ApprovalDecision,
  notes?: string,
) {
  const pending = await prisma.visitApproval.findFirst({
    where: {
      organizationId: ctx.organizationId,
      visitId,
      status: ApprovalStatus.PENDING,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!pending) {
    return null;
  }

  return prisma.visitApproval.update({
    where: { id: pending.id },
    data: {
      status:
        decision === ApprovalDecision.APPROVED
          ? ApprovalStatus.APPROVED
          : ApprovalStatus.REJECTED,
      decision,
      notes: notes ?? null,
      decidedAt: new Date(),
      approverMemberId: ctx.memberId ?? pending.approverMemberId,
    },
  });
}

export async function notifyApprovalRequired(
  ctx: TenantContext,
  visit: Visit,
) {
  const visitor = await prisma.visitor.findFirst({
    where: { id: visit.visitorId, organizationId: ctx.organizationId },
    select: { firstName: true, lastName: true },
  });

  const visitorName = visitor
    ? `${visitor.firstName} ${visitor.lastName}`.trim()
    : "A visitor";

  emitNotification(ctx, {
    kind: "APPROVAL_REQUEST",
    visitId: visit.id,
    visitorId: visit.visitorId,
    visitorName,
  });
}

export async function createApprovalRequest(
  ctx: TenantContext,
  visitId: string,
) {
  const visit = await getVisitById(ctx, visitId);
  await upsertPendingVisitApproval(ctx, visitId, visit.hostMemberId);
  await notifyApprovalRequired(ctx, visit);
  return visit;
}

export async function approveVisit(
  ctx: TenantContext,
  visitId: string,
  notes?: string,
) {
  if (!canApproveVisit(ctx)) {
    requirePermission(ctx, PERMISSIONS.VISIT_APPROVE_PRE_VISIT);
  }

  const existing = await prisma.visit.findFirst({
    where: tenantVisitWhere(ctx, visitId),
    include: visitInclude,
  });

  if (!existing) {
    throw new VisitNotFoundError(visitId);
  }

  const normalized = existing.status;
  if (!isVisitPendingApproval(normalized)) {
    throw new ServiceError(
      "INVALID_APPROVAL_STATE",
      `Visit is not awaiting approval (status: ${existing.status})`,
    );
  }

  const targetStatus = VisitStatus.APPROVED;
  assertVisitTransition(normalized, targetStatus);

  const visit = await prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: { id: existing.id, organizationId: ctx.organizationId },
      data: { status: targetStatus },
      include: visitInclude,
    });

    await tx.visitEvent.create({
      data: {
        organizationId: ctx.organizationId,
        visitId: updated.id,
        type: "status_changed",
        actorId: ctx.userId,
        payload: {
          from: existing.status,
          to: targetStatus,
          notes: notes ?? null,
        },
      },
    });

    return updated;
  });

  await finalizeVisitApproval(ctx, visitId, ApprovalDecision.APPROVED, notes);

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "APPROVED_VISIT",
    resourceType: "Visit",
    resourceId: visitId,
    metadata: { notes: notes ?? null, targetStatus },
  });

  await sendVisitInvitation(ctx, visitId);

  invalidateAnalyticsOnApprovalUpdate(ctx.organizationId);

  return getVisitById(ctx, visitId);
}

export async function rejectVisit(
  ctx: TenantContext,
  visitId: string,
  notes?: string,
) {
  if (!canRejectVisit(ctx)) {
    requirePermission(ctx, PERMISSIONS.VISIT_REJECT);
  }

  const existing = await prisma.visit.findFirst({
    where: tenantVisitWhere(ctx, visitId),
    include: visitInclude,
  });

  if (!existing) {
    throw new VisitNotFoundError(visitId);
  }

  const normalized = existing.status;
  if (!isVisitPendingApproval(normalized)) {
    throw new ServiceError(
      "INVALID_APPROVAL_STATE",
      `Visit is not awaiting approval (status: ${existing.status})`,
    );
  }

  assertVisitTransition(normalized, VisitStatus.REJECTED);

  const visit = await prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: { id: existing.id, organizationId: ctx.organizationId },
      data: { status: VisitStatus.REJECTED },
      include: visitInclude,
    });

    await tx.visitEvent.create({
      data: {
        organizationId: ctx.organizationId,
        visitId: updated.id,
        type: "status_changed",
        actorId: ctx.userId,
        payload: {
          from: existing.status,
          to: VisitStatus.REJECTED,
          notes: notes ?? null,
        },
      },
    });

    return updated;
  });

  await finalizeVisitApproval(ctx, visitId, ApprovalDecision.REJECTED, notes);

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "REJECTED_VISIT",
    resourceType: "Visit",
    resourceId: visitId,
    metadata: { notes: notes ?? null },
  });

  emitNotification(ctx, {
    kind: "VISIT_REJECTED",
    visitId,
    visitorId: visit.visitorId,
    visitorName: `${visit.visitor.firstName} ${visit.visitor.lastName}`.trim(),
    actorId: ctx.userId,
    reason: notes ?? undefined,
  });

  invalidateAnalyticsOnApprovalUpdate(ctx.organizationId);

  return visit;
}

const PENDING_STATUSES: VisitStatus[] = [VisitStatus.PENDING];

export async function listApprovalQueue(
  ctx: TenantContext,
  tab: ApprovalQueueTab,
  options?: { limit?: number; offset?: number },
) {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const limit = Math.min(options?.limit ?? 25, 100);
  const offset = options?.offset ?? 0;

  if (tab === "approved" || tab === "rejected") {
    const decision =
      tab === "approved" ? ApprovalDecision.APPROVED : ApprovalDecision.REJECTED;

    const records = await prisma.visitApproval.findMany({
      where: {
        organizationId: ctx.organizationId,
        decision,
        decidedAt: { not: null },
      },
      include: {
        visit: { include: visitInclude },
        approver: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { decidedAt: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      items: records.map((record) => ({
        approval: record,
        visit: record.visit,
      })),
      total: records.length,
    };
  }

  const [items, total] = await Promise.all([
    prisma.visit.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: { in: PENDING_STATUSES },
      },
      include: visitInclude,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.visit.count({
      where: {
        organizationId: ctx.organizationId,
        status: { in: PENDING_STATUSES },
      },
    }),
  ]);

  return { items, total };
}
