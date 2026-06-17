"use client";

import { Clock3 } from "lucide-react";

import { ApprovalPollStatus } from "@/components/kiosk/approval-poll-status";
import {
  kioskCompactSupporting,
  kioskCompactTitle,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { kioskHostLabel, kioskVisitorName } from "@/lib/kiosk/visit-display";
import { useVisitApprovalPoll } from "@/lib/kiosk/use-visit-approval-poll";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { cn } from "@/lib/utils/cn";

export function KioskApprovalPending({
  visit,
  onApproved,
  onRejected,
  subtitle = "We'll notify you when ready",
}: {
  visit: VisitWithRelations;
  onApproved: (visit: VisitWithRelations) => void;
  onRejected?: (visit: VisitWithRelations) => void;
  subtitle?: string;
}) {
  const {
    polling,
    refresh,
    showConnectionWarning,
    showRetryNow,
  } = useVisitApprovalPoll({
    visitId: visit.id,
    enabled: true,
    onApproved,
    onRejected,
  });

  return (
    <section
      aria-live="polite"
      aria-busy={polling}
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm",
        kioskPhaseEnter,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Clock3 className="h-5 w-5" strokeWidth={1.75} />
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className={kioskCompactTitle}>Check-in request sent</h2>
          <p className={cn("mt-1", kioskCompactSupporting)}>
            Awaiting approval — you can stay on this screen. {subtitle}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 rounded-lg border border-amber-100 bg-[var(--card)]/70 px-3 py-3 text-sm text-[var(--foreground)]">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Visitor</dt>
          <dd className="text-right font-medium text-[var(--foreground)]">
            {kioskVisitorName(visit)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Host</dt>
          <dd className="text-right">{kioskHostLabel(visit)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Branch</dt>
          <dd className="text-right">{visit.branch.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Status</dt>
          <dd className="text-right font-medium text-amber-800">
            Awaiting approval
          </dd>
        </div>
      </dl>

      <ApprovalPollStatus
        showConnectionWarning={showConnectionWarning}
        showRetryNow={showRetryNow}
        polling={polling}
        onRetryNow={() => void refresh()}
      />

      <p className="mt-3 text-center text-xs text-amber-800/80">
        Processing in the background — no action needed right now.
      </p>
    </section>
  );
}
