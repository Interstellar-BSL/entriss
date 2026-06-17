import type { KioskCapturedDocument } from "@/components/kiosk/kiosk-document-upload";
import { getVisit } from "@/lib/api/visits";
import { checkInVisit } from "@/lib/visits/visit-engine-client";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import {
  extractCheckInMediaFromVisit,
  type VisitCheckInMediaRecord,
} from "@/lib/visits/check-in-media";
import type { VisitDetail } from "@/lib/visits/types";

export interface KioskCaptureRequirements {
  requirePhoto: boolean;
  requireDocuments: boolean;
}

export function resolveVisitMedia(
  visit: Pick<VisitDetail, "visitor" | "events" | "checkIn">,
): VisitCheckInMediaRecord {
  return extractCheckInMediaFromVisit({
    visitor: visit.visitor,
    events: visit.events,
    checkIn: visit.checkIn,
  });
}

export function resolveVisitMediaFromSummary(
  visit: VisitWithRelations,
): VisitCheckInMediaRecord {
  return extractCheckInMediaFromVisit({
    visitor: visit.visitor,
  });
}

/** True when required photo/documents are already stored on the visit. */
export function mediaExistsForVisit(
  media: VisitCheckInMediaRecord,
  requirements: KioskCaptureRequirements,
): boolean {
  return !kioskRequiresCaptureBeforeCheckIn(requirements, media);
}

export function kioskRequiresCaptureBeforeCheckIn(
  requirements: KioskCaptureRequirements,
  media: VisitCheckInMediaRecord,
): boolean {
  if (requirements.requirePhoto && !media.photoUrl) {
    return true;
  }
  if (requirements.requireDocuments && media.documents.length === 0) {
    return true;
  }
  return false;
}

export async function loadVisitMedia(
  visitId: string,
): Promise<VisitCheckInMediaRecord> {
  const detail = await getVisit(visitId);
  return resolveVisitMedia(detail);
}

/** Persist kiosk capture without completing check-in when approval is still pending. */
export async function persistKioskVisitMedia(
  visitId: string,
  capture: {
    photoUrl?: string | null;
    documents?: KioskCapturedDocument[];
  },
) {
  const hasPhoto = Boolean(capture.photoUrl?.trim());
  const hasDocuments = (capture.documents?.length ?? 0) > 0;

  if (!hasPhoto && !hasDocuments) {
    return null;
  }

  return checkInVisit({
    visitId,
    photo: capture.photoUrl ?? null,
    documents: capture.documents,
  });
}

export function toKioskCapturedDocuments(
  media: VisitCheckInMediaRecord,
): KioskCapturedDocument[] {
  return media.documents.map((document) => ({
    id: document.id,
    type: "document" as const,
    imageUrl: document.imageUrl,
    label: document.label ?? "Document",
    capturedAt: document.capturedAt
      ? new Date(document.capturedAt)
      : new Date(),
  }));
}

export async function resolveKioskCheckInAfterIdentity(
  visit: VisitWithRelations,
  requirements: KioskCaptureRequirements,
): Promise<
  | { next: "capture" }
  | { next: "check-in"; media: VisitCheckInMediaRecord }
> {
  const media = await loadVisitMedia(visit.id);

  if (mediaExistsForVisit(media, requirements)) {
    return { next: "check-in", media };
  }

  return { next: "capture" };
}
