import { apiFetch } from "@/lib/api/client";
import type {
  DuplicateConfidence,
  DuplicateGroup,
} from "@/lib/services/visitor-duplicate.service";

export type { DuplicateConfidence, DuplicateGroup };

export interface DuplicateVisitorClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  photoUrl: string | null;
  visitCount: number;
  lastVisitAt: string | null;
  createdAt: string;
}

export interface DuplicateGroupClient {
  groupKey: string;
  confidence: DuplicateConfidence;
  reasons: string[];
  visitors: DuplicateVisitorClient[];
}

export async function getPossibleDuplicates(params?: {
  confidence?: DuplicateConfidence;
  limit?: number;
}) {
  const data = await apiFetch<{ duplicates: DuplicateGroup[] }>(
    "/api/v1/visitors/duplicates",
    { searchParams: params },
  );

  return {
    duplicates: data.duplicates.map((group) => ({
      ...group,
      visitors: group.visitors.map((visitor) => ({
        ...visitor,
        lastVisitAt: visitor.lastVisitAt
          ? String(visitor.lastVisitAt)
          : null,
        createdAt: String(visitor.createdAt),
      })),
    })) satisfies DuplicateGroupClient[],
  };
}

export async function markDuplicateGroupReviewed(input: {
  visitorIds: string[];
  confidence: DuplicateConfidence;
}) {
  return apiFetch<{ reviewed: boolean }>("/api/v1/visitors/duplicates/review", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
