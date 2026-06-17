import { VisitStatus } from "@prisma/client";
import type { ResolvedBranchConfig, ResolvedOrganizationConfig } from "@/lib/settings/types";

export type WorkflowUiHint =
  | "continue"
  | "background_pending"
  | "kiosk-approval-pending";

export interface OrganizationApprovalPolicy {
  requireApproval: boolean;
}

export interface WorkflowVisitContext {
  scheduledAt?: Date | string | null;
  isWalkIn?: boolean;
}

export interface WorkflowEvaluationContext extends WorkflowVisitContext {
  arrival?: boolean;
  phase: "create" | "checkin";
}

export interface WorkflowEvaluationResult {
  status: VisitStatus;
  ui: WorkflowUiHint;
  approvalRequired: boolean;
  state?: "APPROVAL_REQUIRED";
}

export function isVisitPendingApproval(status: VisitStatus | string): boolean {
  return status === VisitStatus.PENDING;
}

export function isVisitApprovedForCheckIn(status: VisitStatus | string): boolean {
  return status === VisitStatus.APPROVED;
}

export function isVisitCheckedIn(status: VisitStatus | string): boolean {
  return status === VisitStatus.CHECKED_IN;
}

export function canGenerateVisitBadge(status: VisitStatus | string): boolean {
  return isVisitCheckedIn(status);
}

const KIOSK_BLOCKED_STATUSES = new Set<VisitStatus>([
  VisitStatus.PENDING,
  VisitStatus.CANCELLED,
  VisitStatus.REJECTED,
  VisitStatus.CHECKED_OUT,
]);

/** Statuses that must not enter kiosk check-in flows. */
export function isKioskBlockedVisitStatus(status: VisitStatus | string): boolean {
  return KIOSK_BLOCKED_STATUSES.has(status as VisitStatus);
}

/**
 * Kiosk may proceed into capture / check-in only when the visit is approved.
 */
export function canKioskEnterCheckInFlow(status: VisitStatus | string): boolean {
  return isVisitApprovedForCheckIn(status);
}

/** Pending approval blocks kiosk self-service until staff approves. */
export function isApprovalBlockingKiosk(status: VisitStatus | string): boolean {
  return isVisitPendingApproval(status);
}

export function resolveApprovalPolicy(
  orgConfig: ResolvedOrganizationConfig,
  branchConfig?: Pick<ResolvedBranchConfig, "requiresApproval">,
): OrganizationApprovalPolicy {
  const branchRequiresApproval = branchConfig?.requiresApproval ?? false;

  return {
    requireApproval:
      orgConfig.visitor.requiresApproval || branchRequiresApproval,
  };
}

export function evaluateVisitWorkflow(
  visit: { status: VisitStatus; scheduledAt?: Date | string | null },
  policy: OrganizationApprovalPolicy,
  context: WorkflowEvaluationContext,
): WorkflowEvaluationResult {
  const status = visit.status;

  if (context.phase === "create") {
    if (policy.requireApproval) {
      return {
        status: VisitStatus.PENDING,
        ui: "background_pending",
        approvalRequired: true,
      };
    }

    return {
      status: VisitStatus.APPROVED,
      ui: "continue",
      approvalRequired: false,
    };
  }

  if (status === VisitStatus.PENDING) {
    return {
      status: VisitStatus.PENDING,
      ui: "kiosk-approval-pending",
      approvalRequired: true,
      state: "APPROVAL_REQUIRED",
    };
  }

  if (status === VisitStatus.REJECTED || status === VisitStatus.CANCELLED) {
    return {
      status,
      ui: "continue",
      approvalRequired: false,
    };
  }

  return {
    status: VisitStatus.APPROVED,
    ui: "continue",
    approvalRequired: false,
  };
}
