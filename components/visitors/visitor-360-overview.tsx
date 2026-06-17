"use client";

import { Building2, Mail, Phone, UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { VisitorTagBadges } from "@/components/visitors/visitor-tag-badges";
import { VisitorTypeBadge } from "@/components/visitors/visitor-type-badge";
import type { VisitorInsightsData, VisitorRecord } from "@/lib/api/visitors";
import type { VisitorTag } from "@/lib/visitors/tags";
import { cn } from "@/lib/utils/cn";

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
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainder} min`;
}

function SummaryCard({
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

export function Visitor360Overview({
  visitor,
  tags,
  insights,
  insightsLoading,
  isCheckedIn,
}: {
  visitor: VisitorRecord;
  tags: VisitorTag[];
  insights: VisitorInsightsData | null;
  insightsLoading: boolean;
  isCheckedIn: boolean;
}) {
  const fullName = `${visitor.firstName} ${visitor.lastName}`;
  const currentStatus = isCheckedIn
    ? "Checked in"
    : visitor.isActive === false
      ? "Inactive"
      : insights && insights.visitCount === 0
        ? "No visits"
        : "Not on-site";

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-muted)] text-[var(--muted)] ring-2 ring-[var(--border)]">
            {visitor.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={visitor.photoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound className="h-8 w-8" strokeWidth={1.75} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{fullName}</h2>
            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-[var(--muted)]">
              <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
              {visitor.email ?? "No email"}
            </p>
            <p className="flex items-center gap-1.5 truncate text-sm text-[var(--muted)]">
              <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
              {visitor.phone ?? "No phone"}
            </p>
            {visitor.company ? (
              <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-[var(--muted)]">
                <Building2
                  className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
                  aria-hidden
                />
                {visitor.company}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                  isCheckedIn
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                    : "bg-[var(--surface-muted)] text-[var(--muted)] ring-[var(--border)]",
                )}
              >
                {currentStatus}
              </span>
              {insights ? (
                <VisitorTypeBadge type={insights.visitorType} />
              ) : null}
            </div>

            <VisitorTagBadges tags={tags} className="mt-2" />
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Last visit</CardTitle>
        </CardHeader>
        <CardContent>
          {insightsLoading ? (
            <LoadingState label="Loading last visit…" />
          ) : insights?.lastVisit ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SummaryCard
                label="Date"
                value={formatDate(insights.lastVisit.occurredAt)}
              />
              <SummaryCard label="Host" value={insights.lastVisit.host.name} />
              <SummaryCard
                label="Branch"
                value={insights.lastVisit.branch.name}
              />
              <SummaryCard
                label="Duration"
                value={formatDuration(insights.lastVisit.durationMinutes)}
              />
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No visits recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visit summary</CardTitle>
        </CardHeader>
        <CardContent>
          {insightsLoading ? (
            <LoadingState label="Loading visitor summary…" />
          ) : insights ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <SummaryCard label="Total visits" value={insights.visitCount} />
              <SummaryCard
                label="Favorite host"
                value={insights.favoriteHost?.name ?? "—"}
              />
              <SummaryCard
                label="Favorite branch"
                value={insights.favoriteBranch?.name ?? "—"}
              />
              <SummaryCard
                label="Last visit"
                value={formatDate(insights.lastVisitAt)}
              />
              <SummaryCard
                label="First visit"
                value={formatDate(insights.firstVisitAt)}
              />
              <SummaryCard
                label="Average duration"
                value={formatDuration(insights.averageVisitDurationMinutes)}
              />
              <SummaryCard
                label="Visit frequency"
                value={insights.visitFrequency}
              />
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Summary metrics are unavailable right now.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
