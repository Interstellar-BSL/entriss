"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { Clock3, UserRound } from "lucide-react";

import {
  receptionCard,
  receptionCardBody,
  receptionCardHeader,
  receptionCardSubtitle,
  receptionCardTitle,
  receptionCompactButton,
  receptionRowButton,
} from "@/components/reception/reception-ui";
import { Button } from "@/components/ui/button";
import { VisitorTypeBadge } from "@/components/visitors/visitor-type-badge";
import { ApiError } from "@/lib/api/client";
import {
  getRecentVisitors,
  type RecentVisitorEntry,
} from "@/lib/api/reception-recent";
import { canCheckInVisit, canPrintVisitBadge } from "@/lib/visits/actions";
import { cn } from "@/lib/utils/cn";

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const RecentVisitorRow = memo(function RecentVisitorRow({
  entry,
  busy,
  onOpenVisitor360,
  onOpenVisitHistory,
  onCheckIn,
  onPrintBadge,
}: {
  entry: RecentVisitorEntry;
  busy: boolean;
  onOpenVisitor360: (visitorId: string) => void;
  onOpenVisitHistory: (visitId: string) => void;
  onCheckIn: (visitId: string) => void;
  onPrintBadge: (visitId: string) => void;
}) {
  const { visitor } = entry;
  const name = `${visitor.firstName} ${visitor.lastName}`;
  const checkInTarget = entry.latestVisitId;
  const canCheckIn = canCheckInVisit(entry.latestVisitStatus);
  const canPrint = entry.activeVisitId
    ? canPrintVisitBadge("CHECKED_IN")
    : false;

  return (
    <div className="border-b border-[var(--border)] px-2 py-2 last:border-b-0">
      <button
        type="button"
        className={receptionRowButton("w-full items-start gap-3")}
        onClick={() => onOpenVisitor360(visitor.id)}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
          {visitor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visitor.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-4 w-4" />
          )}
        </div>
        <span className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-[var(--foreground)]">{name}</span>
            <VisitorTypeBadge type={entry.visitorType} />
          </span>
          <span className="block truncate text-xs text-[var(--muted)]">
            {visitor.company ?? "No company"} · {entry.visitCount} visit
            {entry.visitCount === 1 ? "" : "s"}
          </span>
          <span className="block text-[11px] text-[var(--muted)]">
            Last {formatWhen(entry.lastVisitAt)} · {entry.lastHost.name} ·{" "}
            {entry.lastBranch.name}
          </span>
        </span>
      </button>
      <div
        className="mt-1 flex flex-wrap gap-1"
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={receptionCompactButton}
          disabled={busy}
          onClick={() => onOpenVisitor360(visitor.id)}
        >
          Visitor 360
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={receptionCompactButton}
          disabled={busy}
          onClick={() => onOpenVisitHistory(entry.latestVisitId)}
        >
          Visit history
        </Button>
        {canCheckIn ? (
          <Button
            type="button"
            size="sm"
            className={receptionCompactButton}
            disabled={busy}
            onClick={() => onCheckIn(checkInTarget)}
          >
            Check in
          </Button>
        ) : null}
        {canPrint ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={receptionCompactButton}
            disabled={busy}
            onClick={() => onPrintBadge(entry.activeVisitId!)}
          >
            Print badge
          </Button>
        ) : null}
      </div>
    </div>
  );
});

export const RecentVisitorsPanel = memo(function RecentVisitorsPanel({
  refreshNonce = 0,
  busyVisitId = null,
  onOpenVisitor360,
  onOpenVisitHistory,
  onCheckIn,
  onPrintBadge,
}: {
  refreshNonce?: number;
  busyVisitId?: string | null;
  onOpenVisitor360: (visitorId: string) => void;
  onOpenVisitHistory: (visitId: string) => void;
  onCheckIn: (visitId: string) => void;
  onPrintBadge: (visitId: string) => void;
}) {
  const [visitors, setVisitors] = useState<RecentVisitorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecentVisitors = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getRecentVisitors();
      setVisitors(data.visitors);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load recent visitors.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecentVisitors();
  }, [loadRecentVisitors, refreshNonce]);

  return (
    <section className={cn(receptionCard, "flex h-full flex-col")}>
      <div className={receptionCardHeader}>
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--muted)]">
            <Clock3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className={receptionCardTitle}>Recent visitors</h2>
            <p className={receptionCardSubtitle}>
              Repeat visitors and latest activity
            </p>
          </div>
        </div>
      </div>

      <div className={receptionCardBody}>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-md bg-[var(--surface-muted)]" />
            ))}
          </div>
        ) : visitors.length === 0 ? (
          <p className="rounded-md border border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
            No recent visitor activity
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-md border border-[var(--border)]">
            {visitors.map((entry) => (
              <RecentVisitorRow
                key={entry.visitor.id}
                entry={entry}
                busy={busyVisitId === entry.latestVisitId || busyVisitId === entry.activeVisitId}
                onOpenVisitor360={onOpenVisitor360}
                onOpenVisitHistory={onOpenVisitHistory}
                onCheckIn={onCheckIn}
                onPrintBadge={onPrintBadge}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
});
