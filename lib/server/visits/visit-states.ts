import { VisitStatus } from "@prisma/client";

export type VisitState =
  | "APPROVED"
  | "PENDING"
  | "APPROVAL_REQUIRED"
  | "CHECKED_IN";

export type VisitStateSource = {
  status?: string;
  checkedInAt?: Date | string | null;
  requiresApproval?: boolean;
  branch?: { requiresApproval?: boolean } | null;
  /** Explicit workflow flag when check-in approval is required at arrival. */
  approvalRequired?: boolean;
};

function resolveRequiresApproval(visit: VisitStateSource): boolean {
  return Boolean(visit.requiresApproval ?? visit.branch?.requiresApproval);
}

/**
 * Single source of truth for visit state interpretation across API + UI.
 */
export function normalizeVisitState(visit: VisitStateSource): VisitState {
  if (visit.checkedInAt || visit.status === VisitStatus.CHECKED_IN) {
    return "CHECKED_IN";
  }

  if (visit.approvalRequired) {
    return "APPROVAL_REQUIRED";
  }

  if (resolveRequiresApproval(visit)) {
    return "APPROVAL_REQUIRED";
  }

  if (visit.status === VisitStatus.PENDING) {
    return "PENDING";
  }

  return "APPROVED";
}
