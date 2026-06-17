"use client";

import { Clock3, RefreshCw } from "lucide-react";

import { ApprovalPollStatus } from "@/components/kiosk/approval-poll-status";
import {
  kioskCompactButton,
  kioskCompactSupporting,
  kioskCompactTitle,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { Button } from "@/components/ui/button";
import { kioskHostLabel, kioskVisitorName } from "@/lib/kiosk/visit-display";
import { useVisitApprovalPoll } from "@/lib/kiosk/use-visit-approval-poll";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { cn } from "@/lib/utils/cn";

export function KioskPendingApprovalScreen({
  visit,
  onApproved,
  onRejected,
  onCancel,
  subtitle = "We'll update this screen when your visit is approved",
}: {
  visit: VisitWithRelations;
  onApproved: (visit: VisitWithRelations) => void;
  onRejected?: (visit: VisitWithRelations) => void;
  onCancel: () => void;
  subtitle?: string;
}) {
  const {
    polling,
    lastCheckedAt,
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
        "rounded-xl border border-sky-200 bg-sky-50/80 p-5 shadow-sm",
        kioskPhaseEnter,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <Clock3 className="h-5 w-5" strokeWidth={1.75} />
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className={kioskCompactTitle}>Waiting for approval</h2>
          <p className={cn("mt-1", kioskCompactSupporting)}>{subtitle}</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 rounded-lg border border-sky-100 bg-[var(--card)]/70 px-3 py-3 text-sm text-[var(--foreground)]">
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
          <dd className="text-right font-medium text-sky-800">Pending approval</dd>
        </div>
      </dl>

      <p className="mt-3 text-center text-xs text-sky-800/80">
        {polling
          ? "Checking status…"
          : lastCheckedAt
            ? `Last checked ${lastCheckedAt.toLocaleTimeString()}`
            : "Status checks run automatically"}
      </p>

      <ApprovalPollStatus
        showConnectionWarning={showConnectionWarning}
        showRetryNow={showRetryNow}
        polling={polling}
        onRetryNow={() => void refresh()}
      />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="lg"
          className={cn("flex-1", kioskCompactButton)}
          disabled={polling}
          onClick={() => void refresh()}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", polling && "animate-spin")}
            aria-hidden
          />
          {polling ? "Checking…" : "Check status now"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className={cn("flex-1", kioskCompactButton)}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </section>
  );
}
