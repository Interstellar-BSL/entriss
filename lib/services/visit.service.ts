import type { Visit } from "@prisma/client";
import { VisitStatus } from "@prisma/client";
import {
  invalidateAnalyticsOnApprovalUpdate,
  invalidateAnalyticsOnCheckInOut,
  invalidateAnalyticsOnVisitChange,
} from "@/lib/analytics/cache/cache-invalidation";
import { triggerSnapshotRebuild } from "@/lib/analytics/snapshots/snapshot-rebuild";
import { projectVisitStatusNotification } from "@/lib/notifications/projector";
import { sendVisitInvitation } from "@/lib/notifications/visit-invitation";
import { writeAuditLog } from "@/lib/audit/logger";
import { buildPaginatedResult } from "@/lib/api/pagination";
import { prisma } from "@/lib/db/client";
import { assertOrgScope } from "@/lib/api/assert-org-scope";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import {
  findVisitByVisitorDetailsSchema,
  type FindVisitByVisitorDetailsInput,
} from "@/lib/validations/operations";
import {
  checkInVisitSchema,
  checkOutVisitSchema,
  createVisitSchema,
  updateVisitStatusSchema,
  type CreateVisitInput,
  type UpdateVisitStatusInput,
} from "@/lib/validations/visit";

import { resolveBranchConfig, resolveOrganizationConfig } from "@/lib/settings/resolver";

import { generateBadgeData } from "./badge.service";
import {
  QrCheckInDisabledError,
  VisitCheckInError,
  VisitCheckOutError,
  VisitNotFoundError,
  WalkInsNotAllowedError,
} from "./errors";
import {
  assertBranchInTenant,
  assertHostInTenant,
} from "./internal/tenant-guards";
import {
  visitDetailInclude,
  visitInclude,
  type VisitDetailWithRelations,
} from "./internal/visit-include";
import { extractCheckInMediaFromVisit } from "@/lib/visits/check-in-media";
import { persistCheckInCapture } from "./internal/visit-check-in-media";
import { recordVisitEvent } from "./internal/visit-events";
import { ensureVisitQR } from "./qr.service";
import { resolveVisitFromQrGateway } from "@/lib/server/qr/qr-gateway";
import {
  enforceVisitCheckInPolicy,
  type VisitCheckInPolicySource,
} from "@/lib/server/policies/visit-checkin.policy";
import {
  normalizeVisitState,
  type VisitState,
} from "@/lib/server/visits/visit-states";
import {
  evaluateVisitWorkflow,
  isVisitApprovedForCheckIn,
  resolveApprovalPolicy,
} from "@/lib/visits/workflow-engine";

import {
  assertVisitTransition,
} from "./visit-transitions";
import {
  createApprovalRequest,
} from "./approval.service";
import { getVisitorById } from "./visitor.service";

function tenantVisitWhere(ctx: TenantContext, visitId?: string) {
  return {
    organizationId: ctx.organizationId,
    ...(visitId ? { id: visitId } : {}),
  } as const;
}

function permissionForStatusTransition(target: VisitStatus): string {
  switch (target) {
    case VisitStatus.APPROVED:
      return PERMISSIONS.VISIT_APPROVE;
    case VisitStatus.REJECTED:
      return PERMISSIONS.VISIT_REJECT;
    case VisitStatus.CHECKED_IN:
      return PERMISSIONS.VISIT_CHECK_IN;
    case VisitStatus.CHECKED_OUT:
      return PERMISSIONS.VISIT_CHECK_OUT;
    case VisitStatus.CANCELLED:
      return PERMISSIONS.VISITOR_UPDATE;
    default:
      return PERMISSIONS.VISITOR_UPDATE;
  }
}

function invalidateAnalyticsForStatusChange(
  organizationId: string,
  status: VisitStatus,
) {
  if (status === VisitStatus.APPROVED) {
    invalidateAnalyticsOnApprovalUpdate(organizationId);
    triggerSnapshotRebuild(organizationId);
    return;
  }

  if (
    status === VisitStatus.CHECKED_IN ||
    status === VisitStatus.CHECKED_OUT
  ) {
    invalidateAnalyticsOnCheckInOut(organizationId);
    triggerSnapshotRebuild(organizationId);
    return;
  }

  invalidateAnalyticsOnVisitChange(organizationId);
  triggerSnapshotRebuild(organizationId);
}

export async function createVisit(
  ctx: TenantContext,
  input: CreateVisitInput,
  options?: { isWalkIn?: boolean },
): Promise<Visit> {
  requirePermission(ctx, PERMISSIONS.VISITOR_CREATE);

  const data = createVisitSchema.parse(input);

  await getVisitorById(ctx, data.visitorId);
  await assertHostInTenant(ctx, data.hostMemberId);

  const branch = await assertBranchInTenant(ctx, data.branchId);
  const branchConfig = await resolveBranchConfig(ctx, data.branchId);

  if (options?.isWalkIn && !branchConfig.allowWalkIns) {
    throw new WalkInsNotAllowedError();
  }

  const orgConfig = await resolveOrganizationConfig(ctx);
  const policy = resolveApprovalPolicy(orgConfig, branchConfig);
  const workflow = evaluateVisitWorkflow(
    { status: VisitStatus.PENDING, scheduledAt: data.scheduledAt ?? null },
    policy,
    {
      phase: "create",
      isWalkIn: options?.isWalkIn,
      scheduledAt: data.scheduledAt ?? null,
    },
  );
  const initialStatus = workflow.status;

  const visit = await prisma.visit.create({
    data: {
      organizationId: ctx.organizationId,
      visitorId: data.visitorId,
      branchId: data.branchId,
      hostMemberId: data.hostMemberId,
      purpose: data.purpose ?? null,
      scheduledAt: data.scheduledAt ?? null,
      status: initialStatus,
    },
    include: visitInclude,
  });

  if (initialStatus === VisitStatus.PENDING) {
    await createApprovalRequest(ctx, visit.id);
  }

  await recordVisitEvent(
    ctx.organizationId,
    visit.id,
    "visit.created",
    {
      status: initialStatus,
      requiresApproval: branchConfig.requiresApproval,
      branchId: branch.id,
      hostMemberId: data.hostMemberId,
    },
    ctx.userId,
  );

  if (initialStatus === VisitStatus.APPROVED) {
    await sendVisitInvitation(ctx, visit.id);
  }

  invalidateAnalyticsOnVisitChange(ctx.organizationId);
  triggerSnapshotRebuild(ctx.organizationId);

  return visit;
}

/**
 * @deprecated Use `registerWalkInVisit` from `@/lib/visits/visit-engine` instead.
 */
export { registerWalkInVisit as registerVisitorVisit } from "@/lib/visits/visit-engine";

export async function getVisitById(
  ctx: TenantContext,
  visitId: string,
): Promise<Visit> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visit = await prisma.visit.findFirst({
    where: tenantVisitWhere(ctx, visitId),
    include: visitInclude,
  });

  if (!visit) {
    throw new VisitNotFoundError(visitId);
  }

  assertOrgScope(ctx, visit.organizationId);

  return visit;
}

export async function getVisitDetailById(
  ctx: TenantContext,
  visitId: string,
): Promise<VisitDetailWithRelations> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visit = await prisma.visit.findFirst({
    where: tenantVisitWhere(ctx, visitId),
    include: visitDetailInclude,
  });

  if (!visit) {
    throw new VisitNotFoundError(visitId);
  }

  assertOrgScope(ctx, visit.organizationId);

  return visit;
}

export async function updateVisitStatus(
  ctx: TenantContext,
  visitId: string,
  input: UpdateVisitStatusInput,
): Promise<Visit> {
  const data = updateVisitStatusSchema.parse(input);

  requirePermission(ctx, permissionForStatusTransition(data.status));

  const existing = await prisma.visit.findFirst({
    where: tenantVisitWhere(ctx, visitId),
  });

  if (!existing) {
    throw new VisitNotFoundError(visitId);
  }

  assertVisitTransition(existing.status, data.status);

  const now = new Date();
  const updateData: {
    status: VisitStatus;
    checkedInAt?: Date | null;
    checkedOutAt?: Date | null;
    cancelledAt?: Date | null;
    cancelReason?: string | null;
  } = {
    status: data.status,
  };

  if (data.status === VisitStatus.CHECKED_IN) {
    updateData.checkedInAt = now;
  }

  if (data.status === VisitStatus.CHECKED_OUT) {
    updateData.checkedOutAt = now;
  }

  if (data.status === VisitStatus.CANCELLED) {
    updateData.cancelledAt = now;
    updateData.cancelReason = data.cancelReason ?? null;
  }

  const visit = await prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: {
        id: existing.id,
        organizationId: ctx.organizationId,
      },
      data: updateData,
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
          to: data.status,
          notes: data.notes ?? null,
          cancelReason: data.cancelReason ?? null,
        },
      },
    });

    return updated;
  });

  invalidateAnalyticsForStatusChange(ctx.organizationId, data.status);

  void projectVisitStatusNotification(ctx, {
    visitId: visit.id,
    previousStatus: existing.status,
    nextStatus: data.status,
    cancelReason: data.cancelReason,
  }).catch((error) => {
    console.error("[notifications] visit status projection failed", error);
  });

  if (
    data.status === VisitStatus.APPROVED &&
    existing.status !== VisitStatus.APPROVED
  ) {
    void sendVisitInvitation(ctx, visit.id).catch((error) => {
      console.error("[notifications] visit invitation failed", error);
    });
  }

  return visit;
}

export async function checkInVisit(
  ctx: TenantContext,
  visitId: string,
): Promise<Visit> {
  checkInVisitSchema.parse({ visitId });

  return updateVisitStatus(ctx, visitId, {
    status: VisitStatus.CHECKED_IN,
  });
}

export async function checkOutVisit(
  ctx: TenantContext,
  visitId: string,
): Promise<Visit> {
  checkOutVisitSchema.parse({ visitId });

  return updateVisitStatus(ctx, visitId, {
    status: VisitStatus.CHECKED_OUT,
  });
}

export async function approveVisit(
  ctx: TenantContext,
  visitId: string,
  notes?: string,
  options?: { override?: boolean },
): Promise<Visit> {
  const existing = await getVisitById(ctx, visitId);

  if (options?.override && existing.status === VisitStatus.PENDING) {
    const orgConfig = await resolveOrganizationConfig(ctx);
    if (!orgConfig.checkIn.manualOverrideAllowed) {
      throw new VisitCheckInError("Manual approval override is disabled.");
    }
    requirePermission(ctx, PERMISSIONS.VISIT_OVERRIDE_APPROVAL);
  }

  const visit = await updateVisitStatus(ctx, visitId, {
    status: VisitStatus.APPROVED,
    notes,
  });

  await ensureVisitQR(ctx, visitId);

  return visit;
}

export function validateVisitForCheckIn(
  visit: Pick<Visit, "status" | "organizationId">,
): void {
  if (!isVisitApprovedForCheckIn(visit.status)) {
    throw new VisitCheckInError(
      `Visit must be APPROVED to check in (current: ${visit.status})`,
    );
  }
}

export function validateVisitForCheckOut(
  visit: Pick<Visit, "status" | "organizationId">,
): void {
  if (visit.status !== VisitStatus.CHECKED_IN) {
    throw new VisitCheckOutError(
      `Visit must be CHECKED_IN to check out (current: ${visit.status})`,
    );
  }
}

export async function findVisitByVisitorDetails(
  ctx: TenantContext,
  input: FindVisitByVisitorDetailsInput,
) {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const criteria = findVisitByVisitorDetailsSchema.parse(input);

  const visitorFilters: Array<Record<string, unknown>> = [];

  if (criteria.email) {
    visitorFilters.push({ email: criteria.email });
  }

  if (criteria.phone) {
    visitorFilters.push({ phone: criteria.phone });
  }

  if (criteria.name) {
    const parts = criteria.name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || parts[0];
    visitorFilters.push({
      OR: [
        {
          AND: [
            { firstName: { equals: firstName, mode: "insensitive" } },
            { lastName: { equals: lastName, mode: "insensitive" } },
          ],
        },
        {
          OR: [
            { firstName: { contains: criteria.name, mode: "insensitive" } },
            { lastName: { contains: criteria.name, mode: "insensitive" } },
          ],
        },
      ],
    });
  }

  const visits = await prisma.visit.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(criteria.branchId ? { branchId: criteria.branchId } : {}),
      status: criteria.status ?? {
        in: [
          VisitStatus.APPROVED,
          VisitStatus.CHECKED_IN,
          VisitStatus.PENDING,
        ],
      },
      visitor: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        isActive: true,
        OR: visitorFilters,
      },
    },
    include: visitInclude,
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  return visits;
}

interface QrOperationContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: VisitCheckInPolicySource;
  photoUrl?: string | null;
  documents?: Array<{
    id: string;
    type?: string;
    imageUrl: string;
    label?: string;
    capturedAt?: string | Date | null;
  }>;
}

async function resolveVisitFromQrToken(
  ctx: TenantContext,
  qrToken: string,
  action: "check_in" | "check_out",
  meta?: QrOperationContext,
) {
  const resolved = await resolveVisitFromQrGateway(ctx, qrToken, {
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    action,
  });

  return { visit: resolved.visit, token: resolved.token };
}

export async function resolveVisitFromQrScan(
  ctx: TenantContext,
  qrToken: string,
  meta?: Pick<QrOperationContext, "ipAddress" | "userAgent">,
) {
  const resolved = await resolveVisitFromQrGateway(ctx, qrToken, {
    ...meta,
    action: "verify",
  });

  return {
    visit: resolved.visit,
    qr: {
      valid: true as const,
      expiringSoon: resolved.verification.expiringSoon,
      expiresAt: resolved.verification.expiresAt,
    },
  };
}

export async function checkInWithQR(
  ctx: TenantContext,
  qrToken: string,
  meta?: QrOperationContext,
) {
  requirePermission(ctx, PERMISSIONS.VISIT_CHECK_IN);

  const orgConfig = await resolveOrganizationConfig(ctx);
  if (!orgConfig.checkIn.qrRequired) {
    throw new QrCheckInDisabledError();
  }

  const { visit } = await resolveVisitFromQrToken(
    ctx,
    qrToken,
    "check_in",
    meta,
  );

  const result = await checkInWithVisitId(ctx, visit.id, meta);

  return {
    ...result,
    method: "qr" as const,
  };
}

async function completeVisitCheckIn(
  ctx: TenantContext,
  visit: Visit,
  meta: QrOperationContext | undefined,
  method: "visitId" | "qr",
  auditAction: string,
  eventName: string,
  eventMeta: { method: string },
) {
  const updated = await updateVisitStatus(ctx, visit.id, {
    status: VisitStatus.CHECKED_IN,
  });

  await recordVisitEvent(
    ctx.organizationId,
    visit.id,
    eventName,
    eventMeta,
    ctx.userId,
  );

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: auditAction,
    resourceType: "Visit",
    resourceId: visit.id,
    metadata: { method },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  const badge = await generateBadgeData(ctx, visit.id);

  return {
    state: normalizeVisitState(updated),
    visit: updated,
    badge,
    method,
  };
}

export async function checkInWithVisitId(
  ctx: TenantContext,
  visitId: string,
  meta?: QrOperationContext,
) {
  requirePermission(ctx, PERMISSIONS.VISIT_CHECK_IN);

  const source: VisitCheckInPolicySource = meta?.source ?? "api";

  if (meta?.photoUrl || (meta?.documents?.length ?? 0) > 0) {
    const visitForCapture = await getVisitById(ctx, visitId);
    await persistCheckInCapture(ctx, visitForCapture, {
      photoUrl: meta?.photoUrl,
      documents: meta?.documents?.map((document) => ({
        ...document,
        capturedAt:
          document.capturedAt instanceof Date
            ? document.capturedAt.toISOString()
            : document.capturedAt ?? null,
      })),
    });
  }

  const visitDetail = await getVisitDetailById(ctx, visitId);
  const branchConfig = await resolveBranchConfig(ctx, visitDetail.branchId);

  console.info(
    "[VISIT_HOURS_DEBUG]",
    JSON.stringify({
      phase: "resolveBranchConfig",
      visitId: visitDetail.id,
      branchId: visitDetail.branchId,
      branchTimezone: visitDetail.branch.timezone ?? null,
      operational: branchConfig.operational,
    }),
  );

  enforceVisitCheckInPolicy(
    visitDetail,
    branchConfig.operational,
    { source, userId: ctx.userId },
  );

  const visit = await getVisitById(ctx, visitId);
  const orgConfig = await resolveOrganizationConfig(ctx);
  const policy = resolveApprovalPolicy(orgConfig, branchConfig);
  const workflow = evaluateVisitWorkflow(visit, policy, {
    phase: "checkin",
    arrival: true,
    scheduledAt: visit.scheduledAt,
  });

  if (workflow.state === "APPROVAL_REQUIRED") {
    await createApprovalRequest(ctx, visit.id);

    return {
      state: "APPROVAL_REQUIRED" as const satisfies VisitState,
      ui: "kiosk-approval-pending" as const,
      visit: visitDetail,
      method: "visit_id" as const,
    };
  }

  validateVisitForCheckIn(visit);

  return completeVisitCheckIn(
    ctx,
    visit,
    meta,
    "visitId",
    "visit.checked_in.manual",
    "check_in.manual",
    { method: "visitId" },
  );
}

export async function checkOutWithVisitId(
  ctx: TenantContext,
  visitId: string,
  meta?: QrOperationContext,
) {
  requirePermission(ctx, PERMISSIONS.VISIT_CHECK_OUT);

  const visit = await getVisitById(ctx, visitId);
  validateVisitForCheckOut(visit);

  const updated = await updateVisitStatus(ctx, visit.id, {
    status: VisitStatus.CHECKED_OUT,
  });

  await recordVisitEvent(
    ctx.organizationId,
    visit.id,
    "check_out.manual",
    { method: "visitId" },
    ctx.userId,
  );

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "visit.checked_out.manual",
    resourceType: "Visit",
    resourceId: visit.id,
    metadata: { method: "visitId" },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  return { visit: updated };
}

export async function checkOutWithQR(
  ctx: TenantContext,
  qrToken: string,
  meta?: QrOperationContext,
) {
  requirePermission(ctx, PERMISSIONS.VISIT_CHECK_OUT);

  const { visit: resolvedVisit } = await resolveVisitFromQrToken(
    ctx,
    qrToken,
    "check_out",
    meta,
  );

  const visit = await getVisitById(ctx, resolvedVisit.id);
  validateVisitForCheckOut(visit);

  const updated = await updateVisitStatus(ctx, visit.id, {
    status: VisitStatus.CHECKED_OUT,
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "visit.checked_out.qr",
    resourceType: "Visit",
    resourceId: visit.id,
    metadata: { method: "qr" },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  return { visit: updated };
}

export async function rejectVisit(
  ctx: TenantContext,
  visitId: string,
  notes?: string,
): Promise<Visit> {
  return updateVisitStatus(ctx, visitId, {
    status: VisitStatus.REJECTED,
    notes,
  });
}

export async function cancelVisit(
  ctx: TenantContext,
  visitId: string,
  cancelReason: string,
): Promise<Visit> {
  return updateVisitStatus(ctx, visitId, {
    status: VisitStatus.CANCELLED,
    cancelReason,
  });
}

export async function listVisitsByOrganization(
  ctx: TenantContext,
  options?: {
    status?: VisitStatus;
    branchId?: string;
    visitorId?: string;
    hostMemberId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  },
) {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const limit = Math.min(options?.limit ?? 25, 100);
  const offset = options?.offset ?? 0;

  const where = {
    organizationId: ctx.organizationId,
    ...(options?.status ? { status: options.status } : {}),
    ...(options?.branchId ? { branchId: options.branchId } : {}),
    ...(options?.visitorId ? { visitorId: options.visitorId } : {}),
    ...(options?.hostMemberId ? { hostMemberId: options.hostMemberId } : {}),
    ...((options?.dateFrom || options?.dateTo) && {
      createdAt: {
        ...(options.dateFrom ? { gte: options.dateFrom } : {}),
        ...(options.dateTo ? { lte: options.dateTo } : {}),
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.visit.findMany({
      where,
      include: visitInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.visit.count({ where }),
  ]);

  return buildPaginatedResult(items, total, limit, offset);
}
