import { listVisits } from "@/lib/api/visits";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

import type { BranchOption } from "./types";

export function extractBranchesFromVisits(
  visits: VisitWithRelations[],
): BranchOption[] {
  const map = new Map<string, BranchOption>();

  for (const visit of visits) {
    if (!map.has(visit.branch.id)) {
      map.set(visit.branch.id, {
        id: visit.branch.id,
        name: visit.branch.name,
        requiresApproval: visit.branch.requiresApproval,
      });
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadBranchOptions(): Promise<BranchOption[]> {
  const result = await listVisits({ limit: 100, offset: 0 });
  return extractBranchesFromVisits(result.items);
}
