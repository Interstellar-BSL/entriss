"use client";

import { useEffect, useState } from "react";

import { AnalyticsTrendChart } from "@/components/analytics/analytics-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDashboard } from "@/lib/api/analytics";
import { toUserFacingErrorMessage } from "@/lib/api/user-facing-errors";
import { cn } from "@/lib/utils/cn";

type TrendView = "daily" | "weekly" | "monthly";

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfIsoWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function aggregateWeekly(
  points: Array<{ date: string; total: number }>,
): Array<{ date: string; total: number }> {
  const buckets = new Map<string, number>();

  for (const point of points) {
    const weekStart = formatDateInput(startOfIsoWeek(new Date(point.date)));
    buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + point.total);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([date, total]) => ({ date, total }));
}

function aggregateMonthly(
  points: Array<{ date: string; total: number }>,
): Array<{ date: string; total: number }> {
  const buckets = new Map<string, number>();

  for (const point of points) {
    const monthKey = point.date.slice(0, 7);
    buckets.set(monthKey, (buckets.get(monthKey) ?? 0) + point.total);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([date, total]) => ({ date: `${date}-01`, total }));
}

async function loadTrendRange(daysBack: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack);

  const data = await getAnalyticsDashboard({
    period: "custom",
    dateFrom: formatDateInput(from),
    dateTo: formatDateInput(to),
  });

  return data.trend.map((point) => ({ date: point.date, total: point.total }));
}

const VIEW_LABELS: Record<TrendView, string> = {
  daily: "Daily (last 7 days)",
  weekly: "Weekly (last 12 weeks)",
  monthly: "Monthly (last 12 months)",
};

export function DashboardVisitorTrends() {
  const [view, setView] = useState<TrendView>("daily");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<Array<{ date: string; total: number }>>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const daysBack =
          view === "daily" ? 6 : view === "weekly" ? 83 : 364;
        const raw = await loadTrendRange(daysBack);
        const next =
          view === "daily"
            ? raw.slice(-7)
            : view === "weekly"
              ? aggregateWeekly(raw)
              : aggregateMonthly(raw);

        if (!cancelled) {
          setPoints(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            toUserFacingErrorMessage(err, "Could not load visitor trends."),
          );
          setPoints([]);
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
  }, [view]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Visitor trends</CardTitle>
        <div className="flex gap-1 rounded-md border border-[var(--border)] p-0.5">
          {(["daily", "weekly", "monthly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                view === option
                  ? "bg-[var(--brand-primary)] text-[var(--on-brand)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-muted)]",
              )}
            >
              {option === "daily" ? "7d" : option === "weekly" ? "12w" : "12m"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-0">
        <p className="mb-3 text-xs text-[var(--muted)]">{VIEW_LABELS[view]}</p>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div className={cn(loading && "opacity-60")}>
            <AnalyticsTrendChart points={points} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
