"use client";

import { Button } from "@/components/ui/button";
import {
  kioskCompactButton,
  kioskCompactSupporting,
  kioskCompactTitle,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { kioskHostLabel, kioskVisitorName } from "@/lib/kiosk/visit-display";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { cn } from "@/lib/utils/cn";

function formatCheckedInTime(value: string | Date | null | undefined) {
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

export function KioskCheckoutConfirm({
  visit,
  onConfirm,
  onCancel,
  disabled,
}: {
  visit: VisitWithRelations;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <section
      aria-label="Confirm check-out"
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm",
        kioskPhaseEnter,
      )}
    >
      <h2 className={kioskCompactTitle}>Check out now?</h2>
      <p className={cn("mt-1", kioskCompactSupporting)}>
        You are currently checked in. Do you want to check out now?
      </p>

      <div className="mt-4 space-y-1 border-t border-[var(--border)] pt-4">
        <p className="text-base font-semibold text-[var(--foreground)]">
          {kioskVisitorName(visit)}
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
          <dt className="text-[var(--muted)]">Checked in</dt>
          <dd className="text-right">
            {formatCheckedInTime(visit.checkedInAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className={cn(kioskCompactButton, "sm:min-w-[7rem]")}
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className={cn(kioskCompactButton, "sm:min-w-[10rem]")}
          onClick={onConfirm}
          disabled={disabled}
        >
          Check out
        </Button>
      </div>
    </section>
  );
}
