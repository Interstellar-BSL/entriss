import {
  resolveAnalyticsDateRange,
  type AnalyticsDateRange,
  type AnalyticsPeriod,
} from "@/lib/analytics/date-ranges";

export interface AnalyticsQueryFilters {
  period?: AnalyticsPeriod;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  hostId?: string;
  category?: string;
}

export interface NormalizedAnalyticsFilters {
  period?: AnalyticsPeriod;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  hostId?: string;
  category?: string;
  range: AnalyticsDateRange;
}

export function normalizeAnalyticsFilters(
  filters: AnalyticsQueryFilters = {},
  now?: Date,
): NormalizedAnalyticsFilters {
  const range = resolveAnalyticsDateRange({
    period: filters.period,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    now,
  });

  return {
    period: filters.period,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    branchId: filters.branchId,
    hostId: filters.hostId,
    category: filters.category,
    range,
  };
}

export function filtersToCacheParams(
  filters: NormalizedAnalyticsFilters,
): Record<string, string | undefined> {
  return {
    period: filters.range.period,
    from: filters.range.from.toISOString(),
    to: filters.range.to.toISOString(),
    branchId: filters.branchId,
    hostId: filters.hostId,
    category: filters.category,
  };
}
