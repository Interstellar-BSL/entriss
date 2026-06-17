import type { Visitor, Visit } from "@prisma/client";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import {
  createVisitorForStaff,
  getVisitorById,
  resolveVisitorIdentity,
  type VisitorVisitSummary,
} from "@/lib/services/visitor.service";
import {
  approveVisit as approveVisitService,
  listApprovalQueue,
  rejectVisit as rejectVisitService,
  type ApprovalQueueTab,
} from "@/lib/services/approval.service";
import {
  checkInWithQR,
  checkInWithVisitId,
  checkOutWithQR,
  checkOutWithVisitId,
  createVisit,
} from "@/lib/services/visit.service";
import type {
  CreateVisitInput,
  RegisterVisitorVisitInput,
} from "@/lib/validations/visit";
import { registerVisitorVisitSchema } from "@/lib/validations/visit";
import type { CreateVisitorRequestInput } from "@/lib/validations/visitor";
import type { ResolveVisitorIdentityInput } from "@/lib/validations/visitor";

export {
  canKioskEnterCheckInFlow,
  evaluateVisitWorkflow,
  isVisitPendingApproval,
  resolveApprovalPolicy,
} from "@/lib/visits/workflow-engine";

export type { VisitorVisitSummary };

export interface RegisterWalkInResult {
  visitor: Visitor;
  visit: Visit;
  visitorCreated: boolean;
}

export async function resolveVisitor(
  ctx: TenantContext,
  input: ResolveVisitorIdentityInput,
) {
  return resolveVisitorIdentity(ctx, input);
}

export async function createVisitor(
  ctx: TenantContext,
  input: CreateVisitorRequestInput,
) {
  return createVisitorForStaff(ctx, input);
}

export async function createScheduledVisit(
  ctx: TenantContext,
  input: CreateVisitInput,
) {
  return createVisit(ctx, input);
}

export async function registerWalkInVisit(
  ctx: TenantContext,
  input: RegisterVisitorVisitInput,
): Promise<RegisterWalkInResult> {
  const data = registerVisitorVisitSchema.parse(input);

  let visitor: Visitor;
  let visitorCreated: boolean;

  if (data.visitorId) {
    visitor = await getVisitorById(ctx, data.visitorId);
    visitorCreated = false;
  } else if (data.visitor) {
    const result = await createVisitorForStaff(ctx, {
      ...data.visitor,
      forceCreateVisitor: data.forceCreateVisitor ?? false,
    });
    visitor = result.visitor;
    visitorCreated = result.created;
  } else {
    throw new Error("visitorId or visitor is required");
  }

  const visit = await createVisit(
    ctx,
    {
      visitorId: visitor.id,
      branchId: data.visit.branchId,
      hostMemberId: data.visit.hostMemberId,
      purpose: data.visit.purpose,
      scheduledAt: data.visit.scheduledAt,
    },
    { isWalkIn: true },
  );

  return {
    visitor,
    visit,
    visitorCreated,
  };
}

export async function checkInVisit(
  ctx: TenantContext,
  input: { visitId: string } | { qrToken: string },
  meta?: { ipAddress?: string | null; userAgent?: string | null },
) {
  if ("qrToken" in input) {
    return checkInWithQR(ctx, input.qrToken, meta ?? {});
  }

  return checkInWithVisitId(ctx, input.visitId, meta ?? {});
}

export async function checkOutVisit(
  ctx: TenantContext,
  input: { visitId: string } | { qrToken: string },
  meta?: { ipAddress?: string | null; userAgent?: string | null },
) {
  if ("qrToken" in input) {
    return checkOutWithQR(ctx, input.qrToken, meta ?? {});
  }

  return checkOutWithVisitId(ctx, input.visitId, meta ?? {});
}

export type { ApprovalQueueTab };

export async function getApprovalQueue(
  ctx: TenantContext,
  tab: ApprovalQueueTab,
  options?: { limit?: number; offset?: number },
) {
  return listApprovalQueue(ctx, tab, options);
}

export async function approveVisit(
  ctx: TenantContext,
  visitId: string,
  notes?: string,
) {
  return approveVisitService(ctx, visitId, notes);
}

export async function rejectVisit(
  ctx: TenantContext,
  visitId: string,
  notes?: string,
) {
  return rejectVisitService(ctx, visitId, notes);
}
