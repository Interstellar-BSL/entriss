"use client";

import { useEffect, useState } from "react";
import { Clock3, UserRound } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { ApiError } from "@/lib/api/client";
import {
  getVisitorTimeline,
  type VisitorTimelineData,
} from "@/lib/api/visitors";
import { cn } from "@/lib/utils/cn";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateShort(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDuration(minutes: number | null) {
  if (minutes === null) {
    return "—";
  }

  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }

  return `${hours} hr ${remainder} min`;
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
      <p className="text-lg font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function VisitorSummaryCard({ data }: { data: VisitorTimelineData }) {
  const { visitor, metrics } = data;
  const currentStatus =
    metrics.currentlyCheckedIn > 0
      ? "Checked in"
      : metrics.totalVisits === 0
        ? "No visits"
        : "Not on-site";

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
          {visitor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={visitor.photoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound className="h-6 w-6" strokeWidth={1.75} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            {visitor.fullName}
          </h3>
          <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
            {visitor.email ?? "No email"}
          </p>
          <p className="truncate text-sm text-[var(--muted)]">
            {visitor.phone ?? "No phone"}
          </p>
          <p className="mt-2 text-xs font-medium text-[var(--muted)]">
            Current status:{" "}
            <span
              className={cn(
                metrics.currentlyCheckedIn > 0
                  ? "text-emerald-700"
                  : "text-[var(--foreground)]",
              )}
            >
              {currentStatus}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4">
        <SummaryStat
          label="Total visits"
          value={String(metrics.totalVisits)}
        />
        <SummaryStat
          label="Last visit"
          value={formatDateShort(metrics.lastVisitAt)}
        />
        <SummaryStat
          label="Avg duration"
          value={formatDuration(metrics.averageVisitDurationMinutes)}
        />
      </div>
    </section>
  );
}

function VisitMetricsGrid({ metrics }: { metrics: VisitorTimelineData["metrics"] }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        Visit metrics
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricCard label="Total visits" value={metrics.totalVisits} />
        <MetricCard label="Completed" value={metrics.completedVisits} />
        <MetricCard label="Cancelled" value={metrics.cancelledVisits} />
        <MetricCard label="No shows" value={metrics.noShows} />
        <MetricCard
          label="Currently checked in"
          value={metrics.currentlyCheckedIn}
        />
        <MetricCard
          label="First visit"
          value={formatDateShort(metrics.firstVisitAt)}
        />
      </div>
    </section>
  );
}

function ActivityTimeline({ timeline }: { timeline: VisitorTimelineData["timeline"] }) {
  if (timeline.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">No visits recorded yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {timeline.map((entry) => {
        const displayDate =
          entry.checkedInAt ??
          entry.scheduledStart ??
          entry.createdAt;

        return (
          <article
            key={entry.visitId}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  {formatDateShort(displayDate)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">
                    {entry.title}
                  </h4>
                  {entry.forcedCheckIn ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">
                      Forced check-in
                    </span>
                  ) : null}
                  {entry.forcedCheckOut ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">
                      Forced check-out
                    </span>
                  ) : null}
                </div>
              </div>
              <StatusBadge status={entry.status} />
            </div>

            <dl className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Host</dt>
                <dd className="text-right font-medium text-[var(--foreground)]">
                  {entry.hostName}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Branch</dt>
                <dd className="text-right font-medium text-[var(--foreground)]">
                  {entry.branchName}
                </dd>
              </div>
              {entry.checkedInAt ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Checked in</dt>
                  <dd className="text-right">{formatDate(entry.checkedInAt)}</dd>
                </div>
              ) : null}
              {entry.checkedOutAt ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Checked out</dt>
                  <dd className="text-right">{formatDate(entry.checkedOutAt)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Duration</dt>
                <dd className="text-right font-medium text-[var(--foreground)]">
                  {formatDuration(entry.durationMinutes)}
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}

export function VisitorTimelinePanel({ visitorId }: { visitorId: string }) {
  const [data, setData] = useState<VisitorTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const timeline = await getVisitorTimeline(visitorId);
        if (!cancelled) {
          setData(timeline);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load visitor timeline.",
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
  }, [visitorId]);

  if (loading) {
    return <LoadingState label="Loading visitor timeline…" />;
  }

  if (error) {
    return <ErrorState title="Could not load timeline" message={error} />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <VisitorSummaryCard data={data} />
      <VisitMetricsGrid metrics={data.metrics} />
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-[var(--muted)]" aria-hidden />
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Activity timeline
          </h3>
        </div>
        <ActivityTimeline timeline={data.timeline} />
      </section>
    </div>
  );
}
