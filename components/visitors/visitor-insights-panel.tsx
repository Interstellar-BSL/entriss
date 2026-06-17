"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import {
  getVisitorInsights,
  type VisitorInsightsData,
  type VisitFrequency,
} from "@/lib/api/visitors";
import type { VisitorTag } from "@/lib/visitors/tags";
import { VisitorTagBadges } from "@/components/visitors/visitor-tag-badges";
import { VisitorTypeBadge } from "@/components/visitors/visitor-type-badge";
import { cn } from "@/lib/utils/cn";

const VISIT_FREQUENCY_LABELS: Record<VisitFrequency, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const VISIT_FREQUENCY_STYLES: Record<VisitFrequency, string> = {
  LOW: "bg-[var(--surface-muted)] text-[var(--muted)] ring-[var(--border)]",
  MEDIUM: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  HIGH: "bg-orange-50 text-orange-800 ring-orange-100",
};

function formatDate(value: string | null | undefined) {
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

function formatDaysSince(days: number | null) {
  if (days === null) {
    return "—";
  }

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day";
  }

  return `${days} days`;
}

function InsightBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        className,
      )}
    >
      {label}
    </span>
  );
}

function InsightRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-2.5 last:border-b-0">
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className="text-right text-sm font-medium text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function InsightsContent({ insights }: { insights: VisitorInsightsData }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <VisitorTypeBadge type={insights.visitorType} />
        <InsightBadge
          label={`${VISIT_FREQUENCY_LABELS[insights.visitFrequency]} frequency`}
          className={VISIT_FREQUENCY_STYLES[insights.visitFrequency]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visit overview</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <InsightRow label="Visit count" value={insights.visitCount} />
            <InsightRow
              label="Completed visits"
              value={insights.completedVisitCount}
            />
            <InsightRow
              label="Cancelled visits"
              value={insights.cancelledVisitCount}
            />
            <InsightRow label="No shows" value={insights.noShowCount} />
            <InsightRow
              label="First visit"
              value={formatDate(insights.firstVisitAt)}
            />
            <InsightRow
              label="Last visit"
              value={formatDate(insights.lastVisitAt)}
            />
            <InsightRow
              label="Days since last visit"
              value={formatDaysSince(insights.daysSinceLastVisit)}
            />
            <InsightRow
              label="Average duration"
              value={formatDuration(insights.averageVisitDurationMinutes)}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <InsightRow
              label="Favorite branch"
              value={
                insights.favoriteBranch
                  ? `${insights.favoriteBranch.name} (${insights.favoriteBranch.visitCount})`
                  : "—"
              }
            />
            <InsightRow
              label="Favorite host"
              value={
                insights.favoriteHost
                  ? `${insights.favoriteHost.name} (${insights.favoriteHost.visitCount})`
                  : "—"
              }
            />
            <InsightRow
              label="Most recent branch"
              value={insights.mostRecentBranch?.name ?? "—"}
            />
            <InsightRow
              label="Most recent host"
              value={insights.mostRecentHost?.name ?? "—"}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export function VisitorInsightsPanel({
  visitorId,
  tags = [],
  initialInsights = null,
}: {
  visitorId: string;
  tags?: VisitorTag[];
  initialInsights?: VisitorInsightsData | null;
}) {
  const [insights, setInsights] = useState<VisitorInsightsData | null>(
    initialInsights,
  );
  const [loading, setLoading] = useState(!initialInsights);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialInsights) {
      setInsights(initialInsights);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await getVisitorInsights(visitorId);
        if (!cancelled) {
          setInsights(result.insights);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load visitor insights.",
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
  }, [initialInsights, visitorId]);

  useEffect(() => {
    if (initialInsights) {
      setInsights(initialInsights);
    }
  }, [initialInsights]);

  if (loading) {
    return <LoadingState label="Loading visitor insights…" />;
  }

  if (error) {
    return <ErrorState title="Could not load insights" message={error} />;
  }

  if (!insights) {
    return null;
  }

  return (
    <div className="space-y-4">
      <VisitorTagBadges tags={tags} />
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--muted)]" aria-hidden />
        <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Visitor intelligence
        </h3>
      </div>
      <InsightsContent insights={insights} />
    </div>
  );
}
