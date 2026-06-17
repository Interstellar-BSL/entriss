import { apiFetch } from "@/lib/api/client";
import type { VisitStatus } from "@/app/generated/prisma/enums";
import type { VisitorType } from "@/lib/api/visitors";
import type { VisitorTag } from "@/lib/visitors/tags";

export interface UnifiedSearchVisitorResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  company: string | null;
  tags: VisitorTag[];
  visitorType: VisitorType;
  lastVisitAt: string | null;
  matchTier: number;
}

export interface UnifiedSearchVisitResult {
  id: string;
  status: VisitStatus;
  purpose: string | null;
  scheduledAt: string | null;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  host: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
  matchTier: number;
}

export interface UnifiedSearchCheckedInResult {
  visitId: string;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
  host: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
  checkedInAt: string;
  durationMinutes: number | null;
  matchTier: number;
}

export interface UnifiedSearchData {
  visitors: UnifiedSearchVisitorResult[];
  visits: UnifiedSearchVisitResult[];
  checkedIn: UnifiedSearchCheckedInResult[];
}

export async function searchUnified(query: string) {
  return apiFetch<UnifiedSearchData>("/api/v1/search", {
    searchParams: { q: query },
  });
}
