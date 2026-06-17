import { ServiceError } from "@/lib/services/errors";
import type {
  VisitState,
  VisitStateSource,
} from "@/lib/server/visits/visit-states";
import { normalizeVisitState } from "@/lib/server/visits/visit-states";

export type PolicyErrorCode =
  | "KIOSK_DISABLED"
  | "OUTSIDE_VISIT_HOURS"
  | "PHOTO_REQUIRED"
  | "DOCUMENTS_REQUIRED"
  | "ALREADY_CHECKED_IN"
  | "ALREADY_CHECKED_OUT";

const DEFAULT_MESSAGES: Record<PolicyErrorCode, string> = {
  KIOSK_DISABLED: "Kiosk check-in is disabled at this location.",
  OUTSIDE_VISIT_HOURS: "Check-in is unavailable outside operating hours.",
  PHOTO_REQUIRED: "A visitor photo is required before check-in.",
  DOCUMENTS_REQUIRED:
    "At least one identification document is required before check-in.",
  ALREADY_CHECKED_IN: "This visit is already checked in.",
  ALREADY_CHECKED_OUT: "This visit has already been checked out.",
};

export class PolicyError extends ServiceError {
  readonly policyCode: PolicyErrorCode;
  readonly visitState?: VisitState;

  constructor(
    code: PolicyErrorCode,
    message?: string,
    visitContext?: VisitStateSource,
  ) {
    super(code, message ?? DEFAULT_MESSAGES[code]);
    this.name = "PolicyError";
    this.policyCode = code;
    if (visitContext) {
      this.visitState = normalizeVisitState(visitContext);
    }
  }
}

export function isPolicyError(error: unknown): error is PolicyError {
  return error instanceof PolicyError;
}
