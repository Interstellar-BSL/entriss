import { ApiError } from "@/lib/api/client";
import type { KioskCapturedDocument } from "@/components/kiosk/kiosk-document-upload";
import { getVisitBadge } from "@/lib/api/visits";
import { checkInVisit } from "@/lib/visits/visit-engine-client";
import { isVisitCheckedIn } from "@/lib/visits/workflow-engine";
import type { CheckInResult, ThermalBadgeData } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

export type KioskCheckInSuccess = {
  kind: "checked-in";
  visit: VisitWithRelations;
  badge?: ThermalBadgeData | null;
  photoUrl?: string | null;
};

export type KioskCheckInApprovalRequired = {
  kind: "approval-required";
  visit: VisitWithRelations;
};

export type KioskCheckInPending = {
  kind: "pending";
  visit: VisitWithRelations;
};

export type KioskCheckInFailure = {
  kind: "error";
  message: string;
  code?: string;
};

export const POLICY_CAPTURE_ERROR_CODES = new Set([
  "PHOTO_REQUIRED",
  "DOCUMENTS_REQUIRED",
]);

export function isPolicyCaptureErrorCode(
  code: string | undefined,
): code is "PHOTO_REQUIRED" | "DOCUMENTS_REQUIRED" {
  return code === "PHOTO_REQUIRED" || code === "DOCUMENTS_REQUIRED";
}

function isConfirmedCheckInResult(result: CheckInResult): boolean {
  return (
    result.state === "CHECKED_IN" && isVisitCheckedIn(result.visit.status)
  );
}

export type KioskCheckInOutcome =
  | KioskCheckInSuccess
  | KioskCheckInApprovalRequired
  | KioskCheckInPending
  | KioskCheckInFailure;

/** After staff approval — complete badge flow whether visit is APPROVED or already CHECKED_IN. */
export async function completeKioskApprovalOutcome(params: {
  visit: VisitWithRelations;
  visitorId?: string;
  photo?: string | null;
  documents?: KioskCapturedDocument[];
  photoUrl?: string | null;
  source?: "kiosk" | "reception" | "api";
}): Promise<KioskCheckInOutcome> {
  if (isVisitCheckedIn(params.visit.status)) {
    try {
      const badge = await getVisitBadge(params.visit.id);
      return {
        kind: "checked-in",
        visit: params.visit,
        badge,
        photoUrl: params.photo ?? params.photoUrl ?? null,
      };
    } catch {
      return {
        kind: "checked-in",
        visit: params.visit,
        badge: null,
        photoUrl: params.photo ?? params.photoUrl ?? null,
      };
    }
  }

  return runKioskCheckIn({
    visitId: params.visit.id,
    visitorId: params.visitorId ?? params.visit.visitor.id,
    photo: params.photo ?? params.photoUrl ?? null,
    documents: params.documents,
    photoUrl: params.photoUrl,
    source: params.source ?? "kiosk",
  });
}

export type KioskApprovalRejection = {
  kind: "rejected";
  message: string;
};

export function kioskApprovalRejectionOutcome(): KioskApprovalRejection {
  return {
    kind: "rejected",
    message: "Check-in request denied. Please see reception.",
  };
}

export async function runKioskCheckIn(params: {
  visitId: string;
  visitorId?: string;
  photo?: string | null;
  documents?: KioskCapturedDocument[];
  photoUrl?: string | null;
  source?: "kiosk" | "reception" | "api";
}): Promise<KioskCheckInOutcome> {
  try {
    const result = await checkInVisit({
      visitId: params.visitId,
      visitorId: params.visitorId,
      photo: params.photo ?? params.photoUrl ?? null,
      documents: params.documents,
      source: params.source ?? "kiosk",
    });

    if (result.state === "APPROVAL_REQUIRED") {
      return {
        kind: "approval-required",
        visit: result.visit,
      };
    }

    if (result.state === "PENDING") {
      return {
        kind: "pending",
        visit: result.visit,
      };
    }

    if (!isConfirmedCheckInResult(result)) {
      return {
        kind: "error",
        message:
          result.state === "CHECKED_IN"
            ? "Check-in was not confirmed by the server."
            : `Unexpected check-in state: ${result.state}`,
        code:
          result.state === "CHECKED_IN"
            ? "CHECK_IN_NOT_CONFIRMED"
            : "INVALID_CHECK_IN_STATE",
      };
    }

    return {
      kind: "checked-in",
      visit: result.visit,
      badge: result.badge,
      photoUrl: params.photo ?? params.photoUrl ?? null,
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof ApiError ? error.message : "Check-in failed.",
      code: error instanceof ApiError ? error.code : undefined,
    };
  }
}
