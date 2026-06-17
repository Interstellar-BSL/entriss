"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { VisitApprovalPanel } from "@/components/visits/visit-approval-panel";
import { ActivityViewer } from "@/components/activity/activity-viewer";
import { VisitOverrideModal, type VisitOverrideKind } from "@/components/reception/visit-override-modal";
import { VisitDetailsCheckInTab } from "@/components/visits/visit-details-checkin-tab";
import { VisitDetailsOverviewTab } from "@/components/visits/visit-details-overview-tab";
import { VisitTimeline } from "@/components/visits/visit-timeline";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { ApiError } from "@/lib/api/client";
import {
  checkInVisit,
  checkOutVisit,
  forceCheckInVisit,
  forceCheckOutVisit,
  getVisit,
} from "@/lib/api/visits";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { buildVisitAuditTrail } from "@/lib/visits/audit-events";
import { formatRelativeTime } from "@/lib/visits/format-relative-time";
import { shouldShowApprovalTab } from "@/lib/visits/visit-detail-display";
import type { ThermalBadgeData, VisitDetail } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { cn } from "@/lib/utils/cn";

type DrawerTab = "overview" | "approval" | "checkin" | "audit" | "activity";

const BASE_TABS: Array<{ id: DrawerTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "approval", label: "Approval" },
  { id: "checkin", label: "Check-In Details" },
  { id: "activity", label: "Activity" },
  { id: "audit", label: "Audit" },
];

function VisitDetailsHeader({ visit }: { visit: VisitDetail }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold text-[var(--foreground)]">
          {visit.visitor.firstName} {visit.visitor.lastName}
        </h2>
        {visit.visitor.company ? (
          <p className="truncate text-sm text-[var(--muted)]">{visit.visitor.company}</p>
        ) : null}
      </div>
      <StatusBadge status={visit.status} />
    </div>
  );
}

export function VisitDetailsDrawer({
  visitId,
  open,
  initialTab,
  onClose,
  onVisitUpdated,
  onGenerateQr,
  onPrintBadge,
}: {
  visitId: string | null;
  open: boolean;
  initialTab?: DrawerTab;
  onClose: () => void;
  onVisitUpdated?: (visit: VisitWithRelations) => void;
  onGenerateQr: (visit: VisitWithRelations) => void;
  onPrintBadge: (visit: VisitWithRelations, badge?: ThermalBadgeData | null) => void;
}) {
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [overrideKind, setOverrideKind] = useState<VisitOverrideKind | null>(
    null,
  );

  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const canForceCheckIn = permissions.includes(PERMISSIONS.VISIT_FORCE_CHECKIN);
  const canForceCheckOut = permissions.includes(
    PERMISSIONS.VISIT_FORCE_CHECKOUT,
  );

  const onVisitUpdatedRef = useRef(onVisitUpdated);
  const requestIdRef = useRef(0);
  const loadedVisitIdRef = useRef<string | null>(null);
  const actionLockRef = useRef(false);

  useEffect(() => {
    onVisitUpdatedRef.current = onVisitUpdated;
  }, [onVisitUpdated]);

  const loadVisit = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      if (!visitId) {
        return null;
      }

      if (
        !options?.force &&
        loadedVisitIdRef.current === visitId &&
        visit?.id === visitId
      ) {
        return visit;
      }

      const requestId = ++requestIdRef.current;
      const showLoading = !options?.silent;
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await getVisit(visitId);

        if (requestId !== requestIdRef.current) {
          return null;
        }

        setVisit(data);
        loadedVisitIdRef.current = visitId;
        setLastUpdatedAt(new Date());
        return data;
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return null;
        }

        if (loadedVisitIdRef.current !== visitId) {
          setVisit(null);
        }
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not load visit details",
        );
        return null;
      } finally {
        if (requestId === requestIdRef.current && showLoading) {
          setLoading(false);
        }
      }
    },
    [visit, visitId],
  );

  const showApprovalTab = visit ? shouldShowApprovalTab(visit) : false;

  const visibleTabs = BASE_TABS.filter(
    (entry) => entry.id !== "approval" || showApprovalTab,
  );

  useEffect(() => {
    if (!visitId) {
      requestIdRef.current += 1;
      setVisit(null);
      loadedVisitIdRef.current = null;
      setActionError(null);
      setError(null);
      setLoading(false);
      setTab("overview");
      return;
    }

    if (!open) {
      return;
    }

    void loadVisit();
  }, [open, visitId, loadVisit]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const preferred = initialTab ?? "overview";
    if (preferred === "approval" && !showApprovalTab) {
      setTab("overview");
      return;
    }

    setTab(preferred);
  }, [open, initialTab, visitId, showApprovalTab]);

  useEffect(() => {
    if (!visibleTabs.some((entry) => entry.id === tab)) {
      setTab("overview");
    }
  }, [tab, visibleTabs]);

  const refreshVisit = useCallback(
    async (notifyParent = false) => {
      const refreshed = await loadVisit({ silent: true, force: true });
      if (refreshed && notifyParent) {
        onVisitUpdatedRef.current?.(refreshed);
      }
      return refreshed;
    },
    [loadVisit],
  );

  const handleCheckIn = useCallback(async () => {
    if (!visit || actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setActionLoading(true);
    setActionError(null);

    try {
      const result = await checkInVisit(visit.id);
      await refreshVisit(true);
      if (result.badge) {
        onPrintBadge(result.visit, result.badge);
      }
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Check-in failed.",
      );
    } finally {
      actionLockRef.current = false;
      setActionLoading(false);
    }
  }, [visit, refreshVisit, onPrintBadge]);

  const handleCheckOut = useCallback(async () => {
    if (!visit || actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setActionLoading(true);
    setActionError(null);

    try {
      await checkOutVisit(visit.id);
      await refreshVisit(true);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Check-out failed.",
      );
    } finally {
      actionLockRef.current = false;
      setActionLoading(false);
    }
  }, [visit, refreshVisit]);

  const handleForceOverride = useCallback(
    async (payload: { reason: string; note?: string }) => {
      if (!visit || !overrideKind || actionLockRef.current) {
        return;
      }

      actionLockRef.current = true;
      setActionLoading(true);
      setActionError(null);

      try {
        if (overrideKind === "force-check-in") {
          await forceCheckInVisit(visit.id, payload);
        } else {
          await forceCheckOutVisit(visit.id, payload);
        }

        setOverrideKind(null);
        await refreshVisit(true);
      } catch (err) {
        setActionError(
          err instanceof ApiError ? err.message : "Override action failed.",
        );
      } finally {
        actionLockRef.current = false;
        setActionLoading(false);
      }
    },
    [overrideKind, refreshVisit, visit],
  );

  const auditTrail = useMemo(
    () => (visit ? buildVisitAuditTrail(visit.events ?? []) : []),
    [visit],
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      className="w-full max-w-full sm:w-[70vw] sm:max-w-[1000px] sm:min-w-[480px]"
      header={visit ? <VisitDetailsHeader visit={visit} /> : undefined}
      title="Visit details"
    >
      {loading ? <LoadingState variant="panel" /> : null}

      {!loading && error ? (
        <ErrorState
          message={error || "Could not load visit details"}
          onRetry={() => void loadVisit({ force: true })}
        />
      ) : null}

      {!loading && !error && visit ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
            <div className="flex flex-wrap gap-1">
              {visibleTabs.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    tab === entry.id
                      ? "bg-[var(--brand-primary)] text-[var(--on-brand)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {lastUpdatedAt ? (
                <span className="text-xs text-[var(--muted)]">
                  Updated {formatRelativeTime(lastUpdatedAt)}
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={actionLoading}
                disabled={actionLoading}
                onClick={() => void refreshVisit()}
              >
                Refresh
              </Button>
            </div>
          </div>

          {actionError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          ) : null}

          {tab === "overview" ? (
            <VisitDetailsOverviewTab
              visit={visit}
              actionLoading={actionLoading}
              showApprovalTab={showApprovalTab}
              onCheckIn={() => void handleCheckIn()}
              onCheckOut={() => void handleCheckOut()}
              onGenerateQr={onGenerateQr}
              onPrintBadge={onPrintBadge}
              onReviewApproval={() => setTab("approval")}
              canForceCheckIn={canForceCheckIn}
              canForceCheckOut={canForceCheckOut}
              onForceCheckIn={() => setOverrideKind("force-check-in")}
              onForceCheckOut={() => setOverrideKind("force-check-out")}
            />
          ) : null}

          {tab === "approval" && showApprovalTab ? (
            <VisitApprovalPanel
              visit={visit}
              onActionComplete={async () => {
                await refreshVisit(true);
              }}
            />
          ) : null}

          {tab === "checkin" ? (
            <VisitDetailsCheckInTab
              visit={visit}
              onGenerateQr={onGenerateQr}
              onPrintBadge={onPrintBadge}
            />
          ) : null}

          {tab === "activity" ? (
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Unified activity
              </h3>
              <ActivityViewer
                filters={{ visitId: visit.id }}
                emptyMessage="No activity recorded for this visit yet."
              />
            </section>
          ) : null}

          {tab === "audit" ? (
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Visit history
              </h3>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-4">
                <VisitTimeline
                  entries={auditTrail}
                  order="desc"
                  emptyMessage="No audit events recorded for this visit."
                />
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && !visit && open && visitId ? (
        <ErrorState
          message="Could not load visit details"
          onRetry={() => void loadVisit({ force: true })}
        />
      ) : null}

      <VisitOverrideModal
        open={overrideKind !== null && Boolean(visit)}
        kind={overrideKind ?? "force-check-in"}
        visitorName={
          visit
            ? `${visit.visitor.firstName} ${visit.visitor.lastName}`.trim()
            : ""
        }
        busy={actionLoading}
        onClose={() => setOverrideKind(null)}
        onConfirm={(payload) => void handleForceOverride(payload)}
      />
    </Drawer>
  );
}
