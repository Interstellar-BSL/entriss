import { VisitStatus } from "@prisma/client";

import type { VisitDetail, VisitTimelineEntry } from "./types";

function entry(
  id: string,
  label: string,
  timestamp: string | null,
  kind: VisitTimelineEntry["kind"],
  detail?: string,
): VisitTimelineEntry | null {
  if (!timestamp && kind !== "info") {
    return null;
  }

  return { id, label, timestamp, kind, detail };
}

export function buildVisitTimeline(visit: VisitDetail): VisitTimelineEntry[] {
  const items: Array<VisitTimelineEntry | null> = [
    entry("created", "Visit created", visit.createdAt, "info"),
    visit.scheduledAt
      ? entry("scheduled", "Scheduled", String(visit.scheduledAt), "info", visit.purpose ?? undefined)
      : null,
    visit.status === VisitStatus.PENDING
      ? entry("awaiting", "Awaiting approval", visit.updatedAt, "warning")
      : null,
    visit.status === VisitStatus.APPROVED || visit.checkedInAt || visit.checkedOutAt
      ? entry(
          "approved",
          "Approved",
          visit.status === VisitStatus.APPROVED && !visit.checkedInAt
            ? visit.updatedAt
            : visit.checkedInAt
              ? null
              : visit.updatedAt,
          "success",
        )
      : null,
    visit.status === VisitStatus.REJECTED
      ? entry("rejected", "Rejected", visit.updatedAt, "warning")
      : null,
    visit.checkedInAt
      ? entry(
          "checked_in",
          "Checked in",
          String(visit.checkedInAt),
          "success",
          visit.badgeNumber ? `Badge ${visit.badgeNumber}` : undefined,
        )
      : null,
    visit.checkedOutAt
      ? entry("checked_out", "Checked out", String(visit.checkedOutAt), "muted")
      : null,
    visit.status === VisitStatus.CANCELLED
      ? entry(
          "cancelled",
          "Cancelled",
          visit.cancelledAt ? String(visit.cancelledAt) : visit.updatedAt,
          "muted",
          visit.cancelReason ?? undefined,
        )
      : null,
    visit.qrToken
      ? entry(
          "qr",
          "QR issued",
          visit.qrExpiresAt ? String(visit.qrExpiresAt) : visit.updatedAt,
          "info",
          visit.qrExpiresAt ? `Expires ${new Date(visit.qrExpiresAt).toLocaleString()}` : undefined,
        )
      : null,
  ];

  return items
    .filter((item): item is VisitTimelineEntry => item !== null)
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return aTime - bTime;
    });
}
