import type { VisitEventRecord } from "@/lib/services/internal/visit-include";
import type { VisitTimelineEntry } from "@/lib/visits/types";

function payloadRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function eventLabel(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "visit.created":
      return "Created";
    case "visit.checked_in.manual":
    case "visit.checked_in.qr":
    case "check_in.approved":
      return "Checked in";
    case "check_in.capture":
      return "Photo & documents captured";
    case "visit.force_check_in":
      return "FORCED CHECK-IN";
    case "visit.force_check_out":
      return "FORCED CHECK-OUT";
    case "visit.checked_out.manual":
    case "visit.checked_out.qr":
      return "Checked out";
    case "status_changed": {
      const to = payload.to;
      if (to === "APPROVED") {
        return "Approved";
      }
      if (to === "REJECTED") {
        return "Rejected";
      }
      if (to === "PENDING") {
        return "Approval requested";
      }
      if (to === "CHECKED_IN") {
        return "Checked in";
      }
      if (to === "CHECKED_OUT") {
        return "Checked out";
      }
      if (to === "CANCELLED") {
        return "Cancelled";
      }
      return `Status changed to ${String(to ?? "unknown")}`;
    }
    default: {
      if (type.includes("badge")) {
        return "Badge printed";
      }
      return type
        .replaceAll(".", " ")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }
}

function eventKind(
  type: string,
  payload: Record<string, unknown>,
): VisitTimelineEntry["kind"] {
  if (type === "visit.force_check_in" || type === "visit.force_check_out") {
    return "warning";
  }
  if (type === "check_in.approved" || type.includes("checked_in")) {
    return "success";
  }
  if (type === "status_changed" && payload.to === "REJECTED") {
    return "warning";
  }
  if (type === "status_changed" && payload.to === "APPROVED") {
    return "success";
  }
  if (type.includes("checked_out")) {
    return "muted";
  }
  if (type === "status_changed" && payload.to === "CANCELLED") {
    return "warning";
  }
  if (type === "visit.created") {
    return "info";
  }
  return "info";
}

function eventDetail(
  type: string,
  payload: Record<string, unknown>,
  actor: VisitEventRecord["actor"],
): string | undefined {
  const parts: string[] = [];

  if (actor?.name || actor?.email) {
    parts.push(actor.name ?? actor.email);
  }

  if (typeof payload.notes === "string" && payload.notes.trim()) {
    parts.push(payload.notes);
  }

  if (typeof payload.reason === "string" && payload.reason.trim()) {
    parts.push(`Reason: ${payload.reason}`);
  }

  if (typeof payload.note === "string" && payload.note.trim()) {
    parts.push(payload.note);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function buildVisitAuditTrail(
  events: VisitEventRecord[] | undefined,
): VisitTimelineEntry[] {
  return (events ?? []).map((event) => {
    const payload = payloadRecord(event.payload);
    const isOverride =
      event.type === "visit.force_check_in" ||
      event.type === "visit.force_check_out";
    return {
      id: event.id,
      label: eventLabel(event.type, payload),
      timestamp: String(event.createdAt),
      kind: eventKind(event.type, payload),
      detail: eventDetail(event.type, payload, event.actor),
      isOverride,
    };
  });
}
