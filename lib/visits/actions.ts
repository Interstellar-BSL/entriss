import { VisitStatus } from "@prisma/client";

import {
  canGenerateVisitBadge,
  canKioskEnterCheckInFlow,
  isApprovalBlockingKiosk,
  isVisitApprovedForCheckIn,
  isVisitPendingApproval,
} from "@/lib/visits/workflow-engine";

const TERMINAL_STATUSES = new Set<string>([
  VisitStatus.REJECTED,
  VisitStatus.CHECKED_OUT,
  VisitStatus.CANCELLED,
]);

/** Staff manual check-in — visit must already be approved. */
export function canCheckInVisit(status: string): boolean {
  return isVisitApprovedForCheckIn(status as VisitStatus);
}

/** Kiosk check-in path — approved visits only. */
export function canKioskCheckInVisit(status: string): boolean {
  return canKioskEnterCheckInFlow(status as VisitStatus);
}

export function canCheckOutVisit(status: string): boolean {
  return (status as VisitStatus) === VisitStatus.CHECKED_IN;
}

export function canGenerateVisitQr(status: string): boolean {
  return !TERMINAL_STATUSES.has(status);
}

export function canPrintVisitBadge(status: string): boolean {
  return canGenerateVisitBadge(status as VisitStatus);
}

/** Supervisor override — visit exists and is not in a terminal check-in/out state. */
export function canForceCheckInVisit(status: string): boolean {
  const normalized = status as VisitStatus;
  return (
    normalized !== VisitStatus.CHECKED_IN &&
    normalized !== VisitStatus.CHECKED_OUT &&
    normalized !== VisitStatus.CANCELLED &&
    normalized !== VisitStatus.REJECTED
  );
}

export function canForceCheckOutVisit(status: string): boolean {
  return (status as VisitStatus) === VisitStatus.CHECKED_IN;
}

export function isVisitAwaitingApproval(status: string): boolean {
  return isVisitPendingApproval(status as VisitStatus);
}

export function isVisitBlockedAtKiosk(status: string): boolean {
  return (
    isApprovalBlockingKiosk(status as VisitStatus) ||
    (!canKioskCheckInVisit(status) && !canCheckOutVisit(status))
  );
}

/** Kiosk compatibility — pending visit approval gate. */
export function isVisitAwaitingPreVisitApproval(status: string): boolean {
  return isVisitAwaitingApproval(status);
}

/** Kiosk compatibility — check-in approval removed. */
export function isVisitAwaitingCheckinApproval(_status: string): boolean {
  return false;
}
