"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AnalyticsFilters,
  DEFAULT_ANALYTICS_FILTERS,
  toAnalyticsQueryParams,
  type AnalyticsFilterState,
} from "@/components/analytics/analytics-filters";
import {
  AnalyticsBarChart,
  AnalyticsTrendChart,
} from "@/components/analytics/analytics-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import {
  getAnalyticsDashboard,
  type AnalyticsDashboardData,
} from "@/lib/api/analytics";
import type { BranchSummary } from "@/lib/api/branches";

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 transition-shadow hover:shadow-sm">
      <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

export function AnalyticsDashboard({
  branches,
  branchesLoading,
  refreshNonce = 0,
}: {
  branches: BranchSummary[];
  branchesLoading?: boolean;
  refreshNonce?: number;
}) {
  const [filters, setFilters] = useState<AnalyticsFilterState>(
    DEFAULT_ANALYTICS_FILTERS,
  );
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAnalyticsDashboard(toAnalyticsQueryParams(filters));
      setData(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load analytics dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, refreshNonce]);

  const statusChartData = data
    ? [
        { label: "Completed", value: data.statusBreakdown.completed },
        { label: "Checked in", value: data.statusBreakdown.checkedIn },
        { label: "Cancelled", value: data.statusBreakdown.cancelled },
        { label: "No-shows", value: data.statusBreakdown.noShows },
        { label: "Pending", value: data.statusBreakdown.pending },
        { label: "Approved", value: data.statusBreakdown.approved },
      ]
    : [];

  return (
    <div className="space-y-4">
      <AnalyticsFilters
        filters={filters}
        branches={branches}
        branchesLoading={branchesLoading}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      />

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-md bg-[var(--surface-muted)]" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-8">
            <MetricCard label="Today" value={data.kpis.daily} />
            <MetricCard label="This week" value={data.kpis.weekly} />
            <MetricCard label="This month" value={data.kpis.monthly} />
            <MetricCard label="In range" value={data.kpis.totalInRange} />
            <MetricCard label="Checked in" value={data.kpis.checkedIn} />
            <MetricCard label="Completed" value={data.kpis.completed} />
            <MetricCard label="Cancelled" value={data.kpis.cancelled} />
            <MetricCard label="No-shows" value={data.kpis.noShows} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Visits over time</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsTrendChart points={data.trend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsBarChart
                  data={statusChartData}
                  labelKey="label"
                  valueKey="value"
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
