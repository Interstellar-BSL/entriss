import { Building2, Calendar, User } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VisitStatus } from "@/app/generated/prisma/enums";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { kioskHostLabel } from "@/lib/kiosk/visit-display";
import { cn } from "@/lib/utils/cn";

function formatScheduledAt(value: string | Date | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function KioskBookingCard({
  visit,
  checkingIn,
  onCheckIn,
}: {
  visit: VisitWithRelations;
  checkingIn: boolean;
  onCheckIn: (visit: VisitWithRelations) => void;
}) {
  const canCheckIn = visit.status === VisitStatus.APPROVED;
  const awaitingApproval = visit.status === VisitStatus.PENDING;

  return (
    <article
      className={cn(
        "rounded-[1.5rem] border bg-[var(--card)] p-6 shadow-[0_8px_30px_-16px_rgba(0,0,0,0.15)] transition-shadow",
        canCheckIn
          ? "border-blue-100 ring-1 ring-blue-50"
          : "border-[var(--border)]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {visit.visitor.firstName} {visit.visitor.lastName}
          </h3>
          {visit.visitor.company ? (
            <p className="mt-1 text-base text-[var(--muted)]">{visit.visitor.company}</p>
          ) : null}
        </div>
        <StatusBadge status={visit.status} />
      </div>

      <dl className="mt-6 space-y-3 text-base">
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <User className="h-5 w-5 shrink-0 text-[var(--muted)]" strokeWidth={1.75} />
          <span>
            Host:{" "}
            <span className="font-medium text-[var(--foreground)]">
              {kioskHostLabel(visit)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <Building2 className="h-5 w-5 shrink-0 text-[var(--muted)]" strokeWidth={1.75} />
          <span>
            Location:{" "}
            <span className="font-medium text-[var(--foreground)]">{visit.branch.name}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <Calendar className="h-5 w-5 shrink-0 text-[var(--muted)]" strokeWidth={1.75} />
          <span>
            Scheduled:{" "}
            <span className="font-medium text-[var(--foreground)]">
              {formatScheduledAt(visit.scheduledAt)}
            </span>
          </span>
        </div>
      </dl>

      {canCheckIn ? (
        <Button
          type="button"
          className="mt-6 h-14 w-full text-lg"
          disabled={checkingIn}
          onClick={() => onCheckIn(visit)}
        >
          {checkingIn ? "Checking in…" : "Check in now"}
        </Button>
      ) : null}

      {awaitingApproval ? (
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This visit is awaiting approval. Please see reception for assistance.
        </p>
      ) : null}

      {visit.status === VisitStatus.CHECKED_IN ? (
        <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          You are already checked in for this visit.
        </p>
      ) : null}
    </article>
  );
}
