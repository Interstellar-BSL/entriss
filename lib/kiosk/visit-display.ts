import { resolveHostDisplayNameFromVisit } from "@/lib/hosts/display";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

export function kioskVisitorName(visit: VisitWithRelations) {
  return `${visit.visitor.firstName} ${visit.visitor.lastName}`;
}

export function kioskHostLabel(visit: VisitWithRelations) {
  return resolveHostDisplayNameFromVisit(visit);
}

/** Unified metadata line: company · host · branch */
export function kioskVisitMetaLine(visit: VisitWithRelations) {
  const host = kioskHostLabel(visit);
  if (visit.visitor.company) {
    return `${visit.visitor.company} · ${host} · ${visit.branch.name}`;
  }
  return `${host} · ${visit.branch.name}`;
}
