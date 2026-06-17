"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";

import { VisitorRescuePanel } from "@/components/reception/visitor-rescue-panel";
import { DuplicateReviewPanel } from "@/components/visitors/duplicate-review-panel";
import {
  receptionCard,
  receptionCardBody,
  receptionCardHeader,
  receptionCardSubtitle,
  receptionCardTitle,
  receptionCompactButton,
} from "@/components/reception/reception-ui";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  getReceptionDashboard,
  type KioskRecoveryStep,
  type ReceptionAbandonedRegistration,
  type ReceptionDashboard,
} from "@/lib/api/reception";
import { LIVE_ACTIVITY_REFRESH_MS } from "@/lib/reception/live-activity-feed";
import { cn } from "@/lib/utils/cn";

const OPERATIONS_REFRESH_MS = LIVE_ACTIVITY_REFRESH_MS;

export interface ReceptionOperationsWorkspaceProps {
  refreshNonce?: number;
  busyVisitId?: string | null;
  canForceCheckIn?: boolean;
  canForceCheckOut?: boolean;
  onOpenVisitor360: (visitorId: string) => void;
  onOpenVisitDetails: (
    visitId: string,
    tab?: "overview" | "approval" | "checkin" | "audit" | "activity",
  ) => void;
  onResumeKiosk: (visitId: string, step: KioskRecoveryStep) => void;
  onCancelSession: (visitId: string) => void;
  onResumeRegistration: (
    visitId: string,
    stage: ReceptionAbandonedRegistration["progressStage"],
  ) => void;
  onCompleteAtReception: (visitId: string) => void;
  onCancelRegistration: (visitId: string) => void;
  onForceCheckIn?: (visitId: string) => void;
  onForceCheckOut?: (visitId: string) => void;
  onOperationsCountChange?: (count: number) => void;
}

export const ReceptionOperationsWorkspace = memo(
  function ReceptionOperationsWorkspace({
    refreshNonce = 0,
    busyVisitId = null,
    canForceCheckIn = false,
    canForceCheckOut = false,
    onOpenVisitor360,
    onOpenVisitDetails,
    onResumeKiosk,
    onCancelSession,
    onResumeRegistration,
    onCompleteAtReception,
    onCancelRegistration,
    onForceCheckIn,
    onForceCheckOut,
    onOperationsCountChange,
  }: ReceptionOperationsWorkspaceProps) {
    const [dashboard, setDashboard] = useState<ReceptionDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const intervalRef = useRef<number | null>(null);

    const loadDashboard = useCallback(
      async (options?: { silent?: boolean }) => {
        if (!options?.silent) {
          setLoading(true);
        }

        try {
          const data = await getReceptionDashboard();
          setDashboard(data);
          const operationsCount =
            data.failedKioskSessions.length + data.abandonedRegistrations.length;
          onOperationsCountChange?.(operationsCount);
          setError(null);
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load operations data.",
          );
        } finally {
          setLoading(false);
        }
      },
      [onOperationsCountChange],
    );

    useEffect(() => {
      void loadDashboard();
    }, [loadDashboard, refreshNonce]);

    useEffect(() => {
      if (!autoRefresh) {
        return;
      }

      intervalRef.current = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          void loadDashboard({ silent: true });
        }
      }, OPERATIONS_REFRESH_MS);

      return () => {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current);
        }
      };
    }, [autoRefresh, loadDashboard]);

    const showOverrideSection = canForceCheckIn || canForceCheckOut;

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Operations</h2>
            <p className="text-[11px] text-[var(--muted)]">
              Resolve exceptions, duplicates, and manual overrides
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={receptionCompactButton}
              onClick={() => void loadDashboard()}
            >
              Refresh
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={receptionCompactButton}
              onClick={() => setAutoRefresh((value) => !value)}
            >
              {autoRefresh ? "Auto on" : "Auto off"}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <VisitorRescuePanel
          failedKioskSessions={dashboard?.failedKioskSessions ?? []}
          abandonedRegistrations={dashboard?.abandonedRegistrations ?? []}
          loading={loading && !dashboard}
          busyVisitId={busyVisitId}
          onResumeKiosk={onResumeKiosk}
          onOpenVisit={onOpenVisitDetails}
          onCancelSession={onCancelSession}
          onResumeRegistration={onResumeRegistration}
          onCompleteAtReception={onCompleteAtReception}
          onCancelRegistration={onCancelRegistration}
          canForceCheckIn={canForceCheckIn}
          canForceCheckOut={canForceCheckOut}
          onForceCheckIn={onForceCheckIn}
          onForceCheckOut={onForceCheckOut}
        />

        <DuplicateReviewPanel
          refreshNonce={refreshNonce}
          onOpenVisitor360={onOpenVisitor360}
        />

        {showOverrideSection ? (
          <section className={cn(receptionCard)}>
            <div className={receptionCardHeader}>
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h2 className={receptionCardTitle}>Override actions</h2>
                  <p className={receptionCardSubtitle}>
                    Force check-in or check-out when normal flows cannot complete
                  </p>
                </div>
              </div>
            </div>
            <div className={receptionCardBody}>
              <p className="text-xs text-[var(--muted)]">
                Open a visit from the rescue queue or visit details drawer, then
                use force check-in or force check-out on eligible visits. Every
                override is audited.
              </p>
              {dashboard?.metrics.manualOverridesToday ? (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
                  Manual overrides today:{" "}
                  {dashboard.metrics.manualOverridesToday.total} (
                  {dashboard.metrics.manualOverridesToday.forceCheckIns} check-ins
                  · {dashboard.metrics.manualOverridesToday.forceCheckOuts}{" "}
                  check-outs)
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    );
  },
);
