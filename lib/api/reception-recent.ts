import { apiFetch } from "@/lib/api/client";
import type { VisitorType } from "@/lib/api/visitors";

export interface RecentVisitorEntry {
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    photoUrl: string | null;
  };
  lastVisitAt: string;
  lastHost: {
    id: string;
    name: string;
  };
  lastBranch: {
    id: string;
    name: string;
  };
  visitCount: number;
  visitorType: VisitorType;
  activeVisitId: string | null;
  latestVisitId: string;
  latestVisitStatus: string;
}

export async function getRecentVisitors() {
  const data = await apiFetch<{ visitors: RecentVisitorEntry[] }>(
    "/api/v1/reception/recent-visitors",
  );

  return {
    visitors: data.visitors.map((entry) => ({
      ...entry,
      lastVisitAt: String(entry.lastVisitAt),
    })),
  };
}
