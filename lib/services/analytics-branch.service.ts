import { queryAnalytics } from "@/lib/analytics/query/analytics-query.service";
import type { AnalyticsPeriod } from "@/lib/analytics/date-ranges";
import type { TenantContext } from "@/lib/tenant/tenant-context";

export interface BranchAnalyticsFilters {
  period?: AnalyticsPeriod;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
}

export interface BranchAnalyticsRow {
  branchId: string;
  branchName: string;
  totalVisits: number;
  checkIns: number;
  completedVisits: number;
  completionRate: number;
  firstTimeVisitors: number;
  returningVisitors: number;
}

export interface BranchHourlyCell {
  branchId: string;
  branchName: string;
  hour: number;
  count: number;
}

export interface BranchTrendPoint {
  date: string;
  branchId: string;
  branchName: string;
  visits: number;
}

export interface BranchAnalyticsResult {
  range: {
    period: AnalyticsPeriod;
    from: string;
    to: string;
    label: string;
  };
  branches: BranchAnalyticsRow[];
  hourlyHeatmap: BranchHourlyCell[];
  trends: BranchTrendPoint[];
  peakDays: Array<{ branchId: string; branchName: string; date: string; visits: number }>;
  generatedAt: string;
}

export async function getBranchAnalytics(
  ctx: TenantContext,
  filters: BranchAnalyticsFilters = {},
): Promise<BranchAnalyticsResult> {
  return queryAnalytics({
    type: "branch",
    filters,
    ctx,
  });
}
