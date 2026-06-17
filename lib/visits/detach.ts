import type { VisitorRecord } from "@/lib/api/visitors";
import type {
  VisitDetailWithRelations,
  VisitWithRelations,
} from "@/lib/services/internal/visit-include";
import { extractCheckInMediaFromVisit } from "@/lib/visits/check-in-media";
import type { VisitDetail } from "@/lib/visits/types";

export function detachVisitorSnapshot(
  visitor: VisitWithRelations["visitor"],
): VisitWithRelations["visitor"] {
  return {
    id: visitor.id,
    firstName: visitor.firstName,
    lastName: visitor.lastName,
    email: visitor.email,
    phone: visitor.phone,
    company: visitor.company,
    photoUrl: visitor.photoUrl,
  };
}

export function detachVisitWithRelations(
  visit: VisitWithRelations,
): VisitWithRelations {
  return {
    ...visit,
    visitor: detachVisitorSnapshot(visit.visitor),
    branch: { ...visit.branch },
    host: {
      ...visit.host,
      user: { ...visit.host.user },
    },
    organization: { ...visit.organization },
  };
}

export function detachVisits(
  visits: VisitWithRelations[],
): VisitWithRelations[] {
  return visits.map(detachVisitWithRelations);
}

export function detachVisitorRecord(visitor: VisitorRecord): VisitorRecord {
  return { ...visitor };
}

export function detachVisitorRecords(
  visitors: VisitorRecord[],
): VisitorRecord[] {
  return visitors.map(detachVisitorRecord);
}

function safeVisitorSnapshot(
  visitor: VisitWithRelations["visitor"] | null | undefined,
): VisitWithRelations["visitor"] {
  if (!visitor) {
    return {
      id: "",
      firstName: "Unknown",
      lastName: "Visitor",
      email: null,
      phone: null,
      company: null,
      photoUrl: null,
    };
  }

  return detachVisitorSnapshot(visitor);
}

export function detachVisitDetail(
  visit: VisitDetailWithRelations | VisitDetail | null | undefined,
): VisitDetail {
  if (!visit || typeof visit !== "object") {
    throw new Error("Invalid visit payload");
  }

  const base = detachVisitWithRelations({
    ...visit,
    visitor: safeVisitorSnapshot(visit.visitor),
    branch: visit.branch ?? {
      id: "",
      name: "—",
      slug: "",
      code: null,
      timezone: "UTC",
      requiresApproval: false,
      autoCheckoutHours: null,
    },
    host: visit.host ?? {
      id: "",
      userId: "",
      user: { id: "", name: null, email: "—" },
    },
    organization: visit.organization ?? {
      id: "",
      name: "—",
      slug: "",
      logoUrl: null,
      settings: {},
    },
  });

  return {
    ...base,
    createdAt: String(visit.createdAt ?? new Date().toISOString()),
    updatedAt: String(visit.updatedAt ?? new Date().toISOString()),
    cancelledAt: visit.cancelledAt ? String(visit.cancelledAt) : null,
    cancelReason: visit.cancelReason ?? null,
    approvals: (visit.approvals ?? [])
      .filter((record) => record && typeof record === "object")
      .map((record) => ({
        ...record,
        createdAt: record.createdAt,
        decidedAt: record.decidedAt ?? null,
        approver: {
          id: record.approver?.id ?? "",
          user: {
            id: record.approver?.user?.id ?? "",
            name: record.approver?.user?.name ?? null,
            email: record.approver?.user?.email ?? "—",
          },
        },
      })),
    events: (visit.events ?? [])
      .filter((event) => event && typeof event === "object")
      .map((event) => ({
        ...event,
        createdAt: event.createdAt,
        actor: event.actor ? { ...event.actor } : null,
      })),
    checkIn: extractCheckInMediaFromVisit({
      visitor: base.visitor,
      events: (visit.events ?? []).map((event) => ({
        ...event,
        createdAt: event.createdAt,
        actor: event.actor ? { ...event.actor } : null,
      })),
      checkIn: visit.checkIn,
    }),
  };
}
