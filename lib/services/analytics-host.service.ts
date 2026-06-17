import { queryAnalytics } from "@/lib/analytics/query/analytics-query.service";
import type { AnalyticsPeriod } from "@/lib/analytics/date-ranges";
import type { TenantContext } from "@/lib/tenant/tenant-context";

export interface HostAnalyticsFilters {
  period?: AnalyticsPeriod;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  hostId?: string;
}

export interface HostAnalyticsRow {
  hostId: string;
  hostName: string;
  totalVisits: number;
  completedVisits: number;
  pendingVisits: number;
  checkedInVisits: number;
  averageDurationMinutes: number | null;
}

export interface HostAnalyticsResult {
  range: {
    period: AnalyticsPeriod;
    from: string;
    to: string;
    label: string;
  };
  hosts: HostAnalyticsRow[];
  selectedHost: HostAnalyticsRow | null;
  generatedAt: string;
}

export async function getHostAnalytics(
  ctx: TenantContext,
  filters: HostAnalyticsFilters = {},
): Promise<HostAnalyticsResult> {
  return queryAnalytics({
    type: "host",
    filters,
    ctx,
  });
}
