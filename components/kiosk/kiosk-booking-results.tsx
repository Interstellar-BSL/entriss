"use client";

import { StatusBadge } from "@/components/ui/badge";
import { kioskHostLabel, kioskVisitorName } from "@/lib/kiosk/visit-display";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { cn } from "@/lib/utils/cn";

function formatScheduledTime(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function KioskBookingResultCard({
  visit,
  onSelect,
}: {
  visit: VisitWithRelations;
  onSelect: (visit: VisitWithRelations) => void;
}) {
  const host = kioskHostLabel(visit);

  return (
    <button
      type="button"
      onClick={() => onSelect(visit)}
      className={cn(
        "flex h-full min-h-[7.5rem] flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-left shadow-sm",
        "active:border-[var(--border)] active:bg-[var(--surface-muted)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-1 text-sm font-semibold text-[var(--foreground)]">
          {kioskVisitorName(visit)}
        </p>
        <StatusBadge status={visit.status} />
      </div>

      <dl className="mt-2 flex-1 space-y-1 text-xs text-[var(--muted)]">
        <div className="line-clamp-1">
          <span className="text-[var(--muted)]">Host: </span>
          <span className="font-medium text-[var(--foreground)]">{host}</span>
        </div>
        <div className="line-clamp-1">
          <span className="text-[var(--muted)]">Time: </span>
          {formatScheduledTime(visit.scheduledAt ?? visit.checkedInAt)}
        </div>
        <div className="line-clamp-1">
          <span className="text-[var(--muted)]">Branch: </span>
          {visit.branch.name}
        </div>
        {visit.purpose ? (
          <div className="line-clamp-1">
            <span className="text-[var(--muted)]">Purpose: </span>
            {visit.purpose}
          </div>
        ) : null}
      </dl>
    </button>
  );
}

export function KioskBookingResultsList({
  visits,
  onSelect,
}: {
  visits: VisitWithRelations[];
  onSelect: (visit: VisitWithRelations) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-center text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {visits.length === 1
          ? "1 booking found"
          : `${visits.length} bookings found`}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visits.map((visit) => (
          <KioskBookingResultCard key={visit.id} visit={visit} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
