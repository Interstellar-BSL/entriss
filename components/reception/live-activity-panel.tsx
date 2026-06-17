"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

import { LiveActivityStream } from "@/components/reception/live-activity-stream";
import {
  receptionCard,
  receptionCardBody,
  receptionCardHeader,
  receptionCardSubtitle,
  receptionCardTitle,
  receptionCompactButton,
  receptionRowButton,
  receptionSectionLabel,
} from "@/components/reception/reception-ui";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { listVisits } from "@/lib/api/visits";
import { VisitStatus } from "@/app/generated/prisma/enums";
import {
  fetchLiveActivityFeed,
  LIVE_ACTIVITY_REFRESH_MS,
  type LiveActivityFeedEntry,
} from "@/lib/reception/live-activity-feed";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { cn } from "@/lib/utils/cn";

interface TodayMetrics {
  totalToday: number;
  checkedInNow: number;
  checkedOutToday: number;
  pendingApprovals: number;
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
}

function formatCheckInTime(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-2 transition-shadow hover:shadow-sm">
      <p className="text-xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
      <p className="mt-0.5 text-[10px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

const CheckedInRow = memo(function CheckedInRow({
  visit,
  onSelect,
}: {
  visit: VisitWithRelations;
  onSelect: (visitId: string) => void;
}) {
  const name = `${visit.visitor.firstName} ${visit.visitor.lastName}`;

  return (
    <button
      type="button"
      className={receptionRowButton("items-start justify-between gap-2")}
      onClick={() => onSelect(visit.id)}
    >
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm font-medium text-[var(--foreground)]">
          {name}
        </span>
        <span className="block truncate text-xs text-[var(--muted)]">
          {visit.branch.name}
        </span>
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-[var(--muted)]">
        {formatCheckInTime(visit.checkedInAt)}
      </span>
    </button>
  );
});

export const LiveActivityPanel = memo(function LiveActivityPanel({
  onSelectVisit,
  refreshNonce,
  onMetricsLoaded,
}: {
  onSelectVisit: (
    visitId: string,
    tab?: "overview" | "approval" | "audit" | "activity",
  ) => void;
  refreshNonce?: number;
  onMetricsLoaded?: (metrics: TodayMetrics) => void;
}) {
  const [checkedInVisits, setCheckedInVisits] = useState<VisitWithRelations[]>([]);
  const [feedEntries, setFeedEntries] = useState<LiveActivityFeedEntry[]>([]);
  const [metrics, setMetrics] = useState<TodayMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<number | null>(null);

  const loadActivity = useCallback(async (options?: { silent?: boolean }) => {
    const todayRange = getTodayRange();

    if (!options?.silent) {
      setFeedLoading(true);
    }

    try {
      const [
        checkedInList,
        todayVisits,
        checkedInCount,
        checkedOutToday,
        pendingApprovals,
        feed,
      ] = await Promise.all([
        listVisits({ status: VisitStatus.CHECKED_IN, limit: 8 }),
        listVisits({ ...todayRange, limit: 1 }),
        listVisits({ status: VisitStatus.CHECKED_IN, limit: 1 }),
        listVisits({
          status: VisitStatus.CHECKED_OUT,
          ...todayRange,
          limit: 1,
        }),
        listVisits({ status: VisitStatus.PENDING, limit: 1 }),
        fetchLiveActivityFeed(),
      ]);

      setCheckedInVisits(checkedInList.items);
      setFeedEntries(feed);
      setMetrics({
        totalToday: todayVisits.pagination.total,
        checkedInNow: checkedInCount.pagination.total,
        checkedOutToday: checkedOutToday.pagination.total,
        pendingApprovals: pendingApprovals.pagination.total,
      });
      onMetricsLoaded?.({
        totalToday: todayVisits.pagination.total,
        checkedInNow: checkedInCount.pagination.total,
        checkedOutToday: checkedOutToday.pagination.total,
        pendingApprovals: pendingApprovals.pagination.total,
      });
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not refresh live activity.",
      );
    } finally {
      setLoading(false);
      setFeedLoading(false);
    }
  }, [onMetricsLoaded]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity, refreshNonce, onMetricsLoaded]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    intervalRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadActivity({ silent: true });
      }
    }, LIVE_ACTIVITY_REFRESH_MS);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, loadActivity]);

  return (
    <section className={cn(receptionCard, "flex h-full flex-col")}>
      <div className={receptionCardHeader}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className={receptionCardTitle}>Activity</h2>
            <p className={receptionCardSubtitle}>
              Operational history, audit stream, and on-site visitors
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={receptionCompactButton}
              onClick={() => void loadActivity()}
            >
              Refresh
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={receptionCompactButton}
              onClick={() => setAutoRefresh((value) => !value)}
            >
              {autoRefresh ? "Auto on" : "Auto off"}
            </Button>
          </div>
        </div>
      </div>

      <div className={cn(receptionCardBody, "flex flex-1 flex-col gap-3")}>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        {metrics ? (
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Today" value={metrics.totalToday} />
            <MetricCard label="On-site" value={metrics.checkedInNow} />
            <MetricCard label="Checked out" value={metrics.checkedOutToday} />
            <MetricCard label="Pending" value={metrics.pendingApprovals} />
          </div>
        ) : null}

        <LiveActivityStream
          entries={feedEntries}
          loading={loading || feedLoading}
          onSelectVisit={(visitId) => onSelectVisit(visitId, "overview")}
        />

        <div>
          <h4 className={cn("mb-2", receptionSectionLabel)}>On-site now</h4>
          {loading && checkedInVisits.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse rounded-md bg-[var(--surface-muted)]"
                />
              ))}
            </div>
          ) : checkedInVisits.length === 0 ? (
            <p className="rounded-md border border-[var(--border)] px-3 py-3 text-center text-xs text-[var(--muted)]">
              No visitors on-site
            </p>
          ) : (
            <div className="max-h-40 divide-y divide-[var(--border)] overflow-y-auto rounded-md border border-[var(--border)]">
              {checkedInVisits.map((visit) => (
                <CheckedInRow
                  key={visit.id}
                  visit={visit}
                  onSelect={(id) => onSelectVisit(id, "overview")}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
