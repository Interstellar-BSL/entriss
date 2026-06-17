import type { AnalyticsDateRange } from "@/lib/analytics/date-ranges";
import {
  loadAnalyticsVisitRows,
  type AnalyticsVisitRow,
} from "@/lib/analytics/visit-rows";
import type { TenantContext } from "@/lib/tenant/tenant-context";

const inflightLoads = new Map<string, Promise<AnalyticsVisitRow[]>>();

function buildDatasetKey(
  ctx: TenantContext,
  range: AnalyticsDateRange,
  branchId?: string,
) {
  return `${ctx.organizationId}:${range.from.toISOString()}:${range.to.toISOString()}:${branchId ?? "*"}`;
}

export async function getAnalyticsVisitDataset(
  ctx: TenantContext,
  range: AnalyticsDateRange,
  branchId?: string,
): Promise<AnalyticsVisitRow[]> {
  const key = buildDatasetKey(ctx, range, branchId);
  const existing = inflightLoads.get(key);
  if (existing) {
    return existing;
  }

  const promise = loadAnalyticsVisitRows(ctx, range, branchId).finally(() => {
    inflightLoads.delete(key);
  });
  inflightLoads.set(key, promise);
  return promise;
}
