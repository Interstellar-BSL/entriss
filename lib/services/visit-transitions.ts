import { VisitStatus } from "@prisma/client";

import { InvalidVisitTransitionError } from "./errors";

const ALLOWED_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  [VisitStatus.PENDING]: [
    VisitStatus.APPROVED,
    VisitStatus.REJECTED,
    VisitStatus.CANCELLED,
  ],
  [VisitStatus.APPROVED]: [
    VisitStatus.CHECKED_IN,
    VisitStatus.CANCELLED,
  ],
  [VisitStatus.CHECKED_IN]: [VisitStatus.CHECKED_OUT],
  [VisitStatus.REJECTED]: [],
  [VisitStatus.CHECKED_OUT]: [],
  [VisitStatus.CANCELLED]: [],
};

const TERMINAL_STATUSES = new Set<VisitStatus>([
  VisitStatus.REJECTED,
  VisitStatus.CHECKED_OUT,
  VisitStatus.CANCELLED,
]);

export function isTerminalVisitStatus(status: VisitStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function canTransitionVisitStatus(
  from: VisitStatus,
  to: VisitStatus,
): boolean {
  if (from === to) {
    return false;
  }

  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertVisitTransition(
  from: VisitStatus,
  to: VisitStatus,
): void {
  if (!canTransitionVisitStatus(from, to)) {
    throw new InvalidVisitTransitionError(from, to);
  }
}

export function resolveInitialVisitStatus(requiresApproval: boolean): VisitStatus {
  return requiresApproval ? VisitStatus.PENDING : VisitStatus.APPROVED;
}
