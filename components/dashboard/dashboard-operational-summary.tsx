"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDashboard } from "@/lib/api/analytics";
import { getReceptionDashboard } from "@/lib/api/reception";
import { toUserFacingErrorMessage } from "@/lib/api/user-facing-errors";
import { cn } from "@/lib/utils/cn";

function MetricTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}

export function DashboardOperationalSummary() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    todayVisits: 0,
    activeCheckIns: 0,
    pendingApprovals: 0,
    completedToday: 0,
    overdueVisitors: 0,
    walkInsToday: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [reception, analytics] = await Promise.all([
          getReceptionDashboard(),
          getAnalyticsDashboard({ period: "daily" }),
        ]);

        if (cancelled) {
          return;
        }

        setMetrics({
          todayVisits: reception.metrics.todayArrivals,
          activeCheckIns: reception.metrics.checkedInNow,
          pendingApprovals: reception.metrics.pendingApprovals,
          completedToday: analytics.kpis.completed,
          overdueVisitors: reception.metrics.overdueVisitors,
          walkInsToday: reception.metrics.walkInsToday,
        });
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            toUserFacingErrorMessage(err, "Could not load operational summary."),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Operational summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div
            className={cn(
              "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6",
              loading && "opacity-60",
            )}
          >
            <MetricTile label="Today's visits" value={metrics.todayVisits} />
            <MetricTile label="Active check-ins" value={metrics.activeCheckIns} />
            <MetricTile label="Pending approvals" value={metrics.pendingApprovals} />
            <MetricTile label="Completed today" value={metrics.completedToday} />
            <MetricTile label="Overdue visitors" value={metrics.overdueVisitors} />
            <MetricTile label="Walk-ins today" value={metrics.walkInsToday} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
