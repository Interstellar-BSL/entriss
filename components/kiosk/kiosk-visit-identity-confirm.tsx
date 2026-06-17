"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import {
  kioskCompactButton,
  kioskCompactSupporting,
  kioskCompactTitle,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { kioskHostLabel, kioskVisitorName } from "@/lib/kiosk/visit-display";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import {
  canCheckOutVisit,
  canKioskCheckInVisit,
  isVisitAwaitingCheckinApproval,
  isVisitAwaitingPreVisitApproval,
} from "@/lib/visits/actions";
import { cn } from "@/lib/utils/cn";

function formatScheduledTime(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatContact(email: string | null, phone: string | null) {
  return [email, phone].filter(Boolean).join(" · ") || "—";
}

/** Verification-only step — no camera, no check-in, no badge. */
export function KioskVisitIdentityConfirm({
  visit,
  onConfirm,
  onReject,
  disabled,
}: {
  visit: VisitWithRelations;
  onConfirm: () => void;
  onReject: () => void;
  disabled?: boolean;
}) {
  const canCheckIn = canKioskCheckInVisit(visit.status);
  const canCheckOut = canCheckOutVisit(visit.status);
  const awaitingPreVisitApproval = isVisitAwaitingPreVisitApproval(visit.status);
  const awaitingCheckinApproval = isVisitAwaitingCheckinApproval(visit.status);
  const canProceed = canCheckIn || canCheckOut;

  return (
    <section
      aria-label="Confirm your identity"
      className={cn("rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm", kioskPhaseEnter)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={kioskCompactTitle}>Is this your visit?</h2>
          <p className={cn("mt-1", kioskCompactSupporting)}>
            Review the details below and confirm before continuing.
          </p>
        </div>
        <StatusBadge status={visit.status} />
      </div>

      <div className="mt-4 space-y-1 border-t border-[var(--border)] pt-4">
        <p className="text-base font-semibold text-[var(--foreground)]">
          {kioskVisitorName(visit)}
        </p>
        <p className="text-sm text-[var(--muted)]">
          {formatContact(visit.visitor.email, visit.visitor.phone)}
        </p>
        {visit.visitor.company ? (
          <p className="text-sm text-[var(--muted)]">{visit.visitor.company}</p>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Host</dt>
          <dd className="text-right font-medium text-[var(--foreground)]">
            {kioskHostLabel(visit)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Branch</dt>
          <dd className="text-right">{visit.branch.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Scheduled</dt>
          <dd className="text-right">
            {formatScheduledTime(visit.scheduledAt ?? visit.checkedInAt)}
          </dd>
        </div>
        {visit.purpose ? (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Purpose</dt>
            <dd className="text-right">{visit.purpose}</dd>
          </div>
        ) : null}
      </dl>

      {awaitingPreVisitApproval ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This visit is awaiting approval. Please see reception for assistance.
        </p>
      ) : null}

      {awaitingCheckinApproval ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Check-in approval is in progress. Continue to wait on the approval screen.
        </p>
      ) : null}

      {!canProceed && !awaitingPreVisitApproval ? (
        <p className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--muted)]">
          This visit cannot be checked in or out from the kiosk right now.
        </p>
      ) : null}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className={cn(kioskCompactButton, "sm:min-w-[7rem]")}
          onClick={onReject}
          disabled={disabled}
        >
          Not me
        </Button>
        <Button
          type="button"
          className={cn(kioskCompactButton, "sm:min-w-[10rem]")}
          onClick={onConfirm}
          disabled={disabled || !canProceed}
        >
          Yes, this is me
        </Button>
      </div>
    </section>
  );
}
