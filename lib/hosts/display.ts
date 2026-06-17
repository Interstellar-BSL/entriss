import { parseOtherHostFromText } from "@/lib/hosts/host-selection";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

/** Canonical display name for a visit host relation. */
export function resolveHostDisplayName(host: {
  user: { name: string | null; email: string };
}) {
  return host.user.name?.trim() || host.user.email;
}

export function resolveHostDisplayNameFromVisit(visit: VisitWithRelations) {
  const visitorNotes = (visit.visitor as { notes?: string | null }).notes;
  const fromVisitorNotes = parseOtherHostFromText(visitorNotes);
  if (fromVisitorNotes) {
    return fromVisitorNotes.requestedHostName;
  }

  const fromPurpose = parseOtherHostFromText(visit.purpose);
  if (fromPurpose) {
    return fromPurpose.requestedHostName;
  }

  return resolveHostDisplayName(visit.host);
}
