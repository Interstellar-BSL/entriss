import { VisitStatus } from "@prisma/client";
import { PolicyError } from "@/lib/server/errors/policy.errors";
import type { VisitStateSource } from "@/lib/server/visits/visit-states";
import type { BranchOperationalSettings } from "@/lib/settings/branch-operational";
import type { VisitEventRecord } from "@/lib/services/internal/visit-include";
import {
  extractCheckInMediaFromVisit,
  type VisitCheckInMediaRecord,
} from "@/lib/visits/check-in-media";

import { evaluateVisitHours } from "./visit-hours";

export type VisitCheckInPolicySource = "kiosk" | "reception" | "api";

export type VisitCheckInPolicyContext = {
  source: VisitCheckInPolicySource;
  userId?: string;
  now?: Date;
};

export type VisitCheckInPolicyVisit = VisitStateSource & {
  id?: string;
  branchId?: string;
  branch: {
    id?: string;
    timezone?: string | null;
    requiresApproval?: boolean;
  };
  visitor: { photoUrl?: string | null };
  events?: VisitEventRecord[];
};

function resolveVisitMedia(
  visit: VisitCheckInPolicyVisit,
  mediaOverride?: VisitCheckInMediaRecord,
): VisitCheckInMediaRecord {
  if (mediaOverride) {
    return mediaOverride;
  }

  return extractCheckInMediaFromVisit({
    visitor: visit.visitor,
    events: visit.events,
  });
}

/**
 * Authoritative server-side check-in policy gate.
 * Throws PolicyError when the visit cannot proceed to check-in.
 */
export function enforceVisitCheckInPolicy(
  visit: VisitCheckInPolicyVisit,
  branchSettings: BranchOperationalSettings,
  context: VisitCheckInPolicyContext,
  mediaOverride?: VisitCheckInMediaRecord,
): void {
  const status = visit.status as VisitStatus;
  const now = context.now ?? new Date();
  const media = resolveVisitMedia(visit, mediaOverride);

  if (status === VisitStatus.CHECKED_IN) {
    throw new PolicyError("ALREADY_CHECKED_IN", undefined, visit);
  }

  if (status === VisitStatus.CHECKED_OUT) {
    throw new PolicyError("ALREADY_CHECKED_OUT", undefined, visit);
  }

  if (context.source === "kiosk" && branchSettings.kioskEnabled === false) {
    throw new PolicyError("KIOSK_DISABLED", undefined, visit);
  }

  const branchTimezone = visit.branch.timezone ?? undefined;
  const visitHours = evaluateVisitHours(branchSettings, now, branchTimezone);

  if (!visitHours.withinHours) {
    console.info(
      "[VISIT_HOURS_DEBUG]",
      JSON.stringify({
        visitId: visit.id ?? null,
        branchId: visit.branchId ?? visit.branch.id ?? null,
        timezone: branchTimezone ?? null,
        startHour: branchSettings.allowedVisitStartHour,
        endHour: branchSettings.allowedVisitEndHour,
        nowIso: visitHours.nowIso,
        currentMinutes: visitHours.currentMinutes,
        startMinutes: visitHours.startMinutes,
        endMinutes: visitHours.endMinutes,
        operational: branchSettings,
      }),
    );
    throw new PolicyError("OUTSIDE_VISIT_HOURS", undefined, visit);
  }

  if (branchSettings.requireVisitorPhoto && !media.photoUrl) {
    throw new PolicyError("PHOTO_REQUIRED", undefined, visit);
  }

  if (
    branchSettings.requireVisitorDocuments &&
    media.documents.length === 0
  ) {
    throw new PolicyError("DOCUMENTS_REQUIRED", undefined, visit);
  }
}
