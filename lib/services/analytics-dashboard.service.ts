import { queryAnalytics } from "@/lib/analytics/query/analytics-query.service";
import type { AnalyticsPeriod } from "@/lib/analytics/date-ranges";
import type { TenantContext } from "@/lib/tenant/tenant-context";

export interface AnalyticsDashboardFilters {
  period?: AnalyticsPeriod;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
}

export interface AnalyticsTrendPoint {
  date: string;
  total: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
  noShows: number;
}

export interface AnalyticsDashboardResult {
  range: {
    period: AnalyticsPeriod;
    from: string;
    to: string;
    label: string;
  };
  kpis: {
    daily: number;
    weekly: number;
    monthly: number;
    totalInRange: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    noShows: number;
  };
  statusBreakdown: {
    total: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    noShows: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  trend: AnalyticsTrendPoint[];
  generatedAt: string;
}

export async function getAnalyticsDashboard(
  ctx: TenantContext,
  filters: AnalyticsDashboardFilters = {},
): Promise<AnalyticsDashboardResult> {
  return queryAnalytics({
    type: "dashboard",
    filters,
    ctx,
  });
}
