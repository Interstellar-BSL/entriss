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
import { getHostAnalytics, type HostAnalyticsData } from "@/lib/api/analytics";
import type { BranchSummary } from "@/lib/api/branches";

export function HostAnalyticsPanel({
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
  const [data, setData] = useState<HostAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getHostAnalytics(toAnalyticsQueryParams(filters));
      setData(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load host analytics.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshNonce]);

  const topHosts =
    data?.hosts.slice(0, 10).map((host) => ({
      label: host.hostName,
      value: host.totalVisits,
    })) ?? [];

  const selectedHost =
    data?.selectedHost ?? data?.hosts.find((host) => host.hostId === filters.hostId);

  return (
    <div className="space-y-4">
      <AnalyticsFilters
        filters={filters}
        branches={branches}
        branchesLoading={branchesLoading}
        showHostFilter
        hosts={data?.hosts ?? []}
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
              <CardTitle>Top hosts</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsBarChart data={topHosts} labelKey="label" valueKey="value" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Host leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                    <th className="py-2 pr-3">Host</th>
                    <th className="py-2 pr-3">Visits</th>
                    <th className="py-2 pr-3">Completed</th>
                    <th className="py-2 pr-3">Pending</th>
                    <th className="py-2">Avg duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hosts.map((host) => (
                    <tr key={host.hostId} className="border-b border-[var(--border)]">
                      <td className="py-2 pr-3 font-medium text-[var(--foreground)]">
                        {host.hostName}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{host.totalVisits}</td>
                      <td className="py-2 pr-3 tabular-nums">{host.completedVisits}</td>
                      <td className="py-2 pr-3 tabular-nums">{host.pendingVisits}</td>
                      <td className="py-2 tabular-nums">
                        {host.averageDurationMinutes ?? "—"}
                        {host.averageDurationMinutes ? " min" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {selectedHost ? (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Host detail — {selectedHost.hostName}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
                  <p className="text-lg font-semibold tabular-nums">
                    {selectedHost.totalVisits}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">Total visits</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
                  <p className="text-lg font-semibold tabular-nums">
                    {selectedHost.completedVisits}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">Completed</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
                  <p className="text-lg font-semibold tabular-nums">
                    {selectedHost.checkedInVisits}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">Checked in</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
                  <p className="text-lg font-semibold tabular-nums">
                    {selectedHost.averageDurationMinutes ?? "—"}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">Avg duration (min)</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
