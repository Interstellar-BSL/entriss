import type { ActivityCategory, ActivityItem } from "@/lib/activity/types";

type VisitEventRow = {
  id: string;
  visitId: string;
  type: string;
  payload: unknown;
  actorId: string | null;
  createdAt: Date;
  actor: { id: string; name: string | null; email: string } | null;
  visit: {
    id: string;
    branchId: string;
    visitor: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
};

type AuditLogRow = {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: unknown;
  createdAt: Date;
  actor: { id: string; name: string | null; email: string } | null;
  visit?: {
    id: string;
    visitorId: string;
    branchId: string;
    visitor: {
      id: string;
      firstName: string;
      lastName: string;
    };
  } | null;
  visitor?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

function payloadRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }

  return {};
}

function actorName(actor: { name: string | null; email: string } | null): string | undefined {
  if (!actor) {
    return undefined;
  }

  return actor.name?.trim() || actor.email;
}

function visitorName(visitor: {
  firstName: string;
  lastName: string;
}): string {
  return `${visitor.firstName} ${visitor.lastName}`.trim();
}

function visitEventCategory(type: string): ActivityCategory {
  if (type === "visit.force_check_in" || type === "visit.force_check_out") {
    return "security";
  }

  return "visit";
}

function visitEventDescription(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "visit.created":
      return "Visit created";
    case "visit.checked_in.manual":
    case "check_in.manual":
    case "visit.checked_in.qr":
    case "check_in.approved":
      return "Visitor checked in";
    case "check_in.capture":
      return "Visitor photo captured";
    case "visit.force_check_in":
      return "Reception manually checked in visitor";
    case "visit.force_check_out":
      return "Reception manually checked out visitor";
    case "visit.checked_out.manual":
    case "check_out.manual":
    case "visit.checked_out.qr":
      return "Visitor checked out";
    case "status_changed": {
      const to = payload.to;
      if (to === "APPROVED") {
        return "Visit approved";
      }
      if (to === "REJECTED") {
        return "Visit rejected";
      }
      if (to === "PENDING") {
        return "Visit approval requested";
      }
      if (to === "CHECKED_IN") {
        return "Visitor checked in";
      }
      if (to === "CHECKED_OUT") {
        return "Visitor checked out";
      }
      if (to === "CANCELLED") {
        return "Visit cancelled";
      }
      return `Visit status changed to ${String(to ?? "unknown")}`;
    }
    case "qr.scan.success":
      return "QR code scanned successfully";
    case "qr.scan.failed":
      return "QR code scan failed";
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

function auditCategory(action: string, resourceType: string): ActivityCategory {
  const normalized = action.toLowerCase();

  if (action === "FORCE_CHECKIN" || action === "FORCE_CHECKOUT") {
    return "security";
  }

  const resource = resourceType.toLowerCase();

  if (
    normalized.includes("approved") ||
    normalized.includes("rejected") ||
    normalized.includes("approval")
  ) {
    return "approval";
  }

  if (
    normalized.includes("merge") ||
    normalized.includes("identity") ||
    normalized.includes("note") ||
    action === "VISITOR_TAGS_UPDATED" ||
    (resource === "visitor" &&
      (normalized.includes("update") || normalized.includes("create")))
  ) {
    return "identity";
  }

  if (
    normalized.includes("settings") ||
    normalized.includes("branch") ||
    normalized.includes("organization")
  ) {
    return "settings";
  }

  if (
    normalized.includes("role") ||
    normalized.includes("permission") ||
    normalized.includes("login") ||
    normalized.includes("auth") ||
    normalized.includes("security") ||
    normalized.startsWith("qr.")
  ) {
    return "security";
  }

  if (
    normalized.includes("checked_in") ||
    normalized.includes("checked_out") ||
    normalized.includes("check_in") ||
    normalized.includes("check_out")
  ) {
    return "visit";
  }

  return "system";
}

function auditDescription(action: string, resourceType: string): string {
  switch (action) {
    case "APPROVED_VISIT":
      return "Visit approved";
    case "REJECTED_VISIT":
      return "Visit rejected";
    case "NOTE_CREATED":
      return "Visitor note added";
    case "NOTE_UPDATED":
      return "Visitor note updated";
    case "NOTE_DELETED":
      return "Visitor note deleted";
    case "VISITOR_TAGS_UPDATED":
      return "Visitor tags updated";
    case "FORCE_CHECKIN":
      return "Reception manually checked in visitor";
    case "FORCE_CHECKOUT":
      return "Reception manually checked out visitor";
    case "DUPLICATE_REVIEWED":
      return "Possible duplicate visitors reviewed";
    case "visit.checked_in.manual":
      return "Visitor checked in";
    case "visit.checked_out.manual":
      return "Visitor checked out";
    case "visit.checked_out.qr":
      return "Visitor checked out via QR";
    default: {
      if (action.startsWith("qr.")) {
        if (action.endsWith(".success")) {
          return "QR scan succeeded";
        }
        if (action.endsWith(".failed")) {
          return "QR scan failed";
        }
        return "QR security event";
      }

      if (action.toLowerCase().includes("settings")) {
        return "Branch settings updated";
      }

      if (action.toLowerCase().includes("role")) {
        return "User role changed";
      }

      if (action.toLowerCase().includes("identity")) {
        return "Visitor identity updated";
      }

      return `${resourceType} ${action}`
        .replaceAll(".", " ")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }
}

export function mapVisitEventToActivityItem(event: VisitEventRow): ActivityItem {
  const payload = payloadRecord(event.payload);
  let description = visitEventDescription(event.type, payload);

  if (
    event.type === "visit.force_check_in" ||
    event.type === "visit.force_check_out"
  ) {
    const reason =
      typeof payload.reason === "string" ? payload.reason.trim() : "";
    if (reason) {
      description = `${description} — ${reason}`;
    }
  }

  return {
    id: `visit:${event.id}`,
    source: "visit",
    occurredAt: event.createdAt,
    actorId: event.actorId ?? undefined,
    actorName: actorName(event.actor),
    visitorId: event.visit.visitor.id,
    visitorName: visitorName(event.visit.visitor),
    visitId: event.visitId,
    action: event.type,
    category: visitEventCategory(event.type),
    description,
    metadata: {
      branchId: event.visit.branchId,
      ...payload,
    },
  };
}

export function mapAuditLogToActivityItem(log: AuditLogRow): ActivityItem {
  const metadata = payloadRecord(log.metadata);
  const visitor =
    log.visitor ??
    (log.visit
      ? {
          id: log.visit.visitor.id,
          firstName: log.visit.visitor.firstName,
          lastName: log.visit.visitor.lastName,
        }
      : null);

  const visitId =
    log.resourceType.toLowerCase() === "visit"
      ? log.resourceId
      : typeof metadata.visitId === "string"
        ? metadata.visitId
        : log.visit?.id;

  let description = auditDescription(log.action, log.resourceType);
  if (log.action === "FORCE_CHECKIN" || log.action === "FORCE_CHECKOUT") {
    const reason =
      typeof metadata.reason === "string" ? metadata.reason.trim() : "";
    if (reason) {
      description = `${description} — ${reason}`;
    }
  }

  return {
    id: `audit:${log.id}`,
    source: "audit",
    occurredAt: log.createdAt,
    actorId: log.actorId ?? undefined,
    actorName: actorName(log.actor),
    visitorId: visitor?.id,
    visitorName: visitor ? visitorName(visitor) : undefined,
    visitId,
    action: log.action,
    category: auditCategory(log.action, log.resourceType),
    description,
    metadata: {
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ...metadata,
    },
  };
}
