"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AnalyticsFilters,
  DEFAULT_ANALYTICS_FILTERS,
  toAnalyticsQueryParams,
  type AnalyticsFilterState,
} from "@/components/analytics/analytics-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { getAuditAnalytics, type AuditAnalyticsData } from "@/lib/api/analytics";
import type { BranchSummary } from "@/lib/api/branches";

function ComplianceTable({
  title,
  rows,
}: {
  title: string;
  rows: AuditAnalyticsData["missingCheckouts"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No issues found in this range.</p>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="py-2 pr-3">Visitor</th>
                <th className="py-2 pr-3">Branch</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Issue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.visitId} className="border-b border-[var(--border)]">
                  <td className="py-2 pr-3">{row.visitorName}</td>
                  <td className="py-2 pr-3">{row.branchName}</td>
                  <td className="py-2 pr-3">{row.status}</td>
                  <td className="py-2">{row.issue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export function AuditReportsPanel({
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
  const [data, setData] = useState<AuditAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAuditAnalytics(toAnalyticsQueryParams(filters));
      setData(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load audit reports.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshNonce]);

  return (
    <div className="space-y-4">
      <AnalyticsFilters
        filters={filters}
        branches={branches}
        branchesLoading={branchesLoading}
        showCategoryFilter
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Override usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.overrideUsage.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">No overrides in range.</p>
                ) : (
                  data.overrideUsage.map((row) => (
                    <div
                      key={row.action}
                      className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2"
                    >
                      <span>{row.action}</span>
                      <span className="font-semibold tabular-nums">{row.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Suspicious patterns</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {data.suspiciousPatterns.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">No suspicious patterns found.</p>
                ) : (
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                        <th className="py-2 pr-3">Visitor</th>
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.suspiciousPatterns.map((row) => (
                        <tr
                          key={`${row.visitorId}-${row.date}`}
                          className="border-b border-[var(--border)]"
                        >
                          <td className="py-2 pr-3">{row.visitorName}</td>
                          <td className="py-2 pr-3">{row.date}</td>
                          <td className="py-2 tabular-nums">{row.visitCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          <ComplianceTable title="Missing check-outs" rows={data.missingCheckouts} />
          <ComplianceTable title="Approval delays" rows={data.approvalDelays} />

          <Card>
            <CardHeader>
              <CardTitle>Activity stream</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.activity.items.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">No activity in range.</p>
              ) : (
                data.activity.items.slice(0, 25).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-[var(--border)] px-3 py-2 text-xs"
                  >
                    <p className="font-medium text-[var(--foreground)]">{item.description}</p>
                    <p className="mt-0.5 text-[var(--muted)]">
                      {item.category} · {new Date(item.occurredAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
