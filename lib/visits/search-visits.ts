import { listVisitors } from "@/lib/api/visitors";
import { listVisits, type ListVisitsParams } from "@/lib/api/visits";
import type { PaginatedResult } from "@/lib/api/client";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { detachVisitWithRelations } from "@/lib/visits/detach";

const SEARCH_VISITOR_LIMIT = 10;
const VISITS_PER_VISITOR = 25;

function visitSortKey(visit: VisitWithRelations) {
  const value =
    visit.checkedInAt ?? visit.scheduledAt ?? visit.checkedOutAt ?? null;
  return value ? new Date(value).getTime() : 0;
}

export async function searchVisitsByVisitor(
  search: string,
  filters: ListVisitsParams,
): Promise<PaginatedResult<VisitWithRelations>> {
  const visitors = await listVisitors({
    search,
    limit: SEARCH_VISITOR_LIMIT,
    offset: 0,
  });

  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  if (visitors.items.length === 0) {
    return {
      items: [],
      pagination: { total: 0, limit, offset: 0, hasMore: false },
    };
  }

  const visitBatches = await Promise.all(
    visitors.items.map((visitor) =>
      listVisits({
        ...filters,
        visitorId: visitor.id,
        limit: VISITS_PER_VISITOR,
        offset: 0,
      }),
    ),
  );

  const merged = new Map<string, VisitWithRelations>();
  for (const batch of visitBatches) {
    for (const visit of batch.items) {
      merged.set(visit.id, detachVisitWithRelations(visit));
    }
  }

  const sorted = [...merged.values()].sort(
    (a, b) => visitSortKey(b) - visitSortKey(a),
  );

  const items = sorted.slice(offset, offset + limit);

  return {
    items,
    pagination: {
      total: sorted.length,
      limit,
      offset,
      hasMore: offset + items.length < sorted.length,
    },
  };
}
