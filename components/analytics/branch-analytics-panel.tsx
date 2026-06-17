"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AnalyticsFilters,
  DEFAULT_ANALYTICS_FILTERS,
  toAnalyticsQueryParams,
  type AnalyticsFilterState,
} from "@/components/analytics/analytics-filters";
import { AnalyticsBarChart } from "@/components/analytics/analytics-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import {
  getBranchAnalytics,
  type BranchAnalyticsData,
} from "@/lib/api/analytics";
import type { BranchSummary } from "@/lib/api/branches";

export function BranchAnalyticsPanel({
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
  const [data, setData] = useState<BranchAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getBranchAnalytics(toAnalyticsQueryParams(filters));
      setData(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load branch analytics.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshNonce]);

  const branchChartData =
    data?.branches.map((branch) => ({
      label: branch.branchName,
      value: branch.totalVisits,
    })) ?? [];

  const selectedBranchId = filters.branchId;
  const heatmapRows = (data?.hourlyHeatmap ?? []).filter(
    (cell) => !selectedBranchId || cell.branchId === selectedBranchId,
  );

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
        <div className="h-40 animate-pulse rounded-md bg-[var(--surface-muted)]" />
      ) : data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Visits per branch</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsBarChart
                data={branchChartData}
                labelKey="label"
                valueKey="value"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branch performance</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                    <th className="py-2 pr-3">Branch</th>
                    <th className="py-2 pr-3">Visits</th>
                    <th className="py-2 pr-3">Check-ins</th>
                    <th className="py-2 pr-3">Completion</th>
                    <th className="py-2">Returning</th>
                  </tr>
                </thead>
                <tbody>
                  {data.branches.map((branch) => (
                    <tr key={branch.branchId} className="border-b border-[var(--border)]">
                      <td className="py-2 pr-3 font-medium text-[var(--foreground)]">
                        {branch.branchName}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{branch.totalVisits}</td>
                      <td className="py-2 pr-3 tabular-nums">{branch.checkIns}</td>
                      <td className="py-2 pr-3 tabular-nums">{branch.completionRate}%</td>
                      <td className="py-2 tabular-nums">{branch.returningVisitors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Hourly activity heatmap</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="grid grid-cols-[repeat(24,minmax(1.5rem,1fr))] gap-1">
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div key={hour} className="text-center text-[10px] text-[var(--muted)]">
                    {hour}
                  </div>
                ))}
                {heatmapRows.length === 0 ? (
                  <p className="col-span-24 py-4 text-center text-xs text-[var(--muted)]">
                    No hourly activity in range
                  </p>
                ) : (
                  heatmapRows.map((cell) => {
                    const intensity = Math.min(1, cell.count / 10);
                    return (
                      <div
                        key={`${cell.branchId}-${cell.hour}`}
                        title={`${cell.branchName} ${cell.hour}:00 — ${cell.count}`}
                        className="aspect-square rounded-sm"
                        style={{
                          backgroundColor: `rgba(24, 24, 27, ${0.12 + intensity * 0.75})`,
                        }}
                      />
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
