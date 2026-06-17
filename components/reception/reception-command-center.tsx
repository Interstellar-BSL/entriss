"use client";

import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  ReceptionApprovalQuickActions,
  ReceptionVisitQuickActions,
} from "@/components/reception/reception-visit-quick-actions";
import {
  receptionCard,
  receptionCardBody,
  receptionCardHeader,
  receptionCardSubtitle,
  receptionCardTitle,
  receptionCompactButton,
  receptionRowButton,
} from "@/components/reception/reception-ui";
import { RecentVisitorsPanel } from "@/components/reception/recent-visitors-panel";
import { ReceptionCommandFastActions } from "@/components/reception/reception-command-fast-actions";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  getReceptionDashboard,
  type ReceptionDashboard,
  type ReceptionDashboardVisitRow,
  type ReceptionPendingApprovalRow,
} from "@/lib/api/reception";
import { LIVE_ACTIVITY_REFRESH_MS } from "@/lib/reception/live-activity-feed";
import { cn } from "@/lib/utils/cn";

const DASHBOARD_REFRESH_MS = LIVE_ACTIVITY_REFRESH_MS;

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatWhen(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
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

function visitorName(visitor: { firstName: string; lastName: string }) {
  return `${visitor.firstName} ${visitor.lastName}`;
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 transition-shadow hover:shadow-sm">
      <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-md bg-[var(--surface-muted)]" />
      ))}
    </div>
  );
}

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-md bg-[var(--surface-muted)]" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
      {message}
    </p>
  );
}

export interface ReceptionCommandCenterProps {
  refreshNonce?: number;
  busyVisitId?: string | null;
  onMetricsLoaded?: (metrics: ReceptionDashboard["metrics"]) => void;
  onCheckIn: (visitId: string) => void;
  onCheckOut: (visitId: string) => void;
  onPrintBadge: (visitId: string) => void;
  onOpenVisitor360: (visitorId: string) => void;
  onOpenVisitDetails: (
    visitId: string,
    tab?: "overview" | "approval" | "checkin" | "audit" | "activity",
  ) => void;
  canForceCheckIn?: boolean;
  canForceCheckOut?: boolean;
  onForceCheckIn?: (visitId: string) => void;
  onForceCheckOut?: (visitId: string) => void;
  onOpenVisitHistory?: (visitId: string) => void;
  onScanQr: () => void;
  onFocusSearch: () => void;
  onOperationalCountChange?: (count: number) => void;
}

const VisitRow = memo(function VisitRow({
  row,
  busy,
  scheduledLabel,
  extra,
  onCheckIn,
  onCheckOut,
  onPrintBadge,
  onOpenVisitor360,
  onOpenVisitDetails,
  canForceCheckIn,
  canForceCheckOut,
  onForceCheckIn,
  onForceCheckOut,
}: {
  row: ReceptionDashboardVisitRow;
  busy: boolean;
  scheduledLabel?: string;
  extra?: React.ReactNode;
  onCheckIn: ReceptionCommandCenterProps["onCheckIn"];
  onCheckOut: ReceptionCommandCenterProps["onCheckOut"];
  onPrintBadge: ReceptionCommandCenterProps["onPrintBadge"];
  onOpenVisitor360: ReceptionCommandCenterProps["onOpenVisitor360"];
  onOpenVisitDetails: ReceptionCommandCenterProps["onOpenVisitDetails"];
  canForceCheckIn?: boolean;
  canForceCheckOut?: boolean;
  onForceCheckIn?: (visitId: string) => void;
  onForceCheckOut?: (visitId: string) => void;
}) {
  return (
    <div className="border-b border-[var(--border)] px-2 py-2 last:border-b-0">
      <button
        type="button"
        className={receptionRowButton("w-full flex-col items-stretch gap-1")}
        onClick={() => onOpenVisitDetails(row.visitId, "overview")}
      >
        <div className="flex w-full items-start justify-between gap-2">
          <span className="min-w-0 text-left">
            <span className="block truncate text-sm font-medium text-[var(--foreground)]">
              {visitorName(row.visitor)}
            </span>
            <span className="block truncate text-xs text-[var(--muted)]">
              Host {row.host.name} · {row.branch.name}
            </span>
          </span>
          <div className="shrink-0 text-right">
            {scheduledLabel ? (
              <span className="block text-[11px] tabular-nums text-[var(--muted)]">
                {scheduledLabel}
              </span>
            ) : null}
            <StatusBadge status={row.status} />
          </div>
        </div>
        {extra}
      </button>
      <ReceptionVisitQuickActions
        visitId={row.visitId}
        visitorId={row.visitor.id}
        status={row.status}
        busy={busy}
        compact
        canForceCheckIn={canForceCheckIn}
        canForceCheckOut={canForceCheckOut}
        onCheckIn={onCheckIn}
        onCheckOut={onCheckOut}
        onPrintBadge={onPrintBadge}
        onOpenVisitor360={onOpenVisitor360}
        onOpenVisitDetails={onOpenVisitDetails}
        onForceCheckIn={onForceCheckIn}
        onForceCheckOut={onForceCheckOut}
      />
    </div>
  );
});

const PendingApprovalRow = memo(function PendingApprovalRow({
  row,
  busy,
  onOpenApproval,
  onOpenVisitor360,
  onOpenVisitDetails,
  canForceCheckIn,
  onForceCheckIn,
}: {
  row: ReceptionPendingApprovalRow;
  busy: boolean;
  onOpenApproval: (visitId: string) => void;
  onOpenVisitor360: ReceptionCommandCenterProps["onOpenVisitor360"];
  onOpenVisitDetails: ReceptionCommandCenterProps["onOpenVisitDetails"];
  canForceCheckIn?: boolean;
  onForceCheckIn?: (visitId: string) => void;
}) {
  return (
    <div className="border-b border-[var(--border)] px-2 py-2 last:border-b-0">
      <button
        type="button"
        className={receptionRowButton("w-full flex-col items-stretch gap-1")}
        onClick={() =>
          onOpenVisitDetails(
            row.visitId,
            row.approvalKind === "PENDING" ? "approval" : "approval",
          )
        }
      >
        <div className="flex w-full items-start justify-between gap-2">
          <span className="min-w-0 text-left">
            <span className="block truncate text-sm font-medium text-[var(--foreground)]">
              {visitorName(row.visitor)}
            </span>
            <span className="block truncate text-xs text-[var(--muted)]">
              Host {row.host.name}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-[var(--muted)]">
            {formatWhen(row.createdAt)}
          </span>
        </div>
      </button>
      <ReceptionApprovalQuickActions
        visitId={row.visitId}
        visitorId={row.visitor.id}
        approvalKind={row.approvalKind}
        busy={busy}
        canForceCheckIn={canForceCheckIn}
        onOpenApproval={onOpenApproval}
        onOpenVisitor360={onOpenVisitor360}
        onOpenVisitDetails={(visitId) => onOpenVisitDetails(visitId, "overview")}
        onForceCheckIn={onForceCheckIn}
      />
    </div>
  );
});

function DashboardSection({
  title,
  subtitle,
  loading,
  isEmpty,
  emptyMessage,
  children,
}: {
  title: string;
  subtitle?: string;
  loading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(receptionCard, "flex h-full flex-col")}>
      <div className={receptionCardHeader}>
        <h2 className={receptionCardTitle}>{title}</h2>
        {subtitle ? <p className={receptionCardSubtitle}>{subtitle}</p> : null}
      </div>
      <div className={cn(receptionCardBody, "flex-1")}>
        {loading ? (
          <SectionSkeleton />
        ) : isEmpty ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="rounded-md border border-[var(--border)]">{children}</div>
        )}
      </div>
    </section>
  );
}

export const ReceptionCommandCenter = memo(function ReceptionCommandCenter({
  refreshNonce = 0,
  busyVisitId = null,
  onMetricsLoaded,
  onCheckIn,
  onCheckOut,
  onPrintBadge,
  onOpenVisitor360,
  onOpenVisitDetails,
  canForceCheckIn = false,
  canForceCheckOut = false,
  onForceCheckIn,
  onForceCheckOut,
  onOpenVisitHistory,
  onScanQr,
  onFocusSearch,
  onOperationalCountChange,
}: ReceptionCommandCenterProps) {
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
        onMetricsLoaded?.(data.metrics);
        onOperationalCountChange?.(
          data.failedKioskSessions.length + data.abandonedRegistrations.length,
        );
        setError(null);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load reception dashboard.",
        );
      } finally {
        setLoading(false);
      }
    },
    [onMetricsLoaded, onOperationalCountChange],
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
    }, DASHBOARD_REFRESH_MS);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, loadDashboard]);

  const handleOpenApproval = useCallback(
    (visitId: string) => {
      onOpenVisitDetails(visitId, "approval");
    },
    [onOpenVisitDetails],
  );

  const overrideRowProps = {
    canForceCheckIn,
    canForceCheckOut,
    onForceCheckIn,
    onForceCheckOut,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Command center</h2>
          <p className="text-[11px] text-[var(--muted)]">
            Today&apos;s operations at a glance
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

      {loading && !dashboard ? (
        <MetricsSkeleton />
      ) : dashboard ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Today arrivals" value={dashboard.metrics.todayArrivals} />
          <MetricCard label="Checked in now" value={dashboard.metrics.checkedInNow} />
          <MetricCard
            label="Pending approvals"
            value={dashboard.metrics.pendingApprovals}
          />
          <MetricCard
            label="Expected (2 hr)"
            value={dashboard.expectedArrivals.length}
          />
          <MetricCard
            label="Overdue visitors"
            value={dashboard.metrics.overdueVisitors}
          />
          <MetricCard
            label="Walk-ins awaiting"
            value={
              dashboard.failedKioskSessions.length +
              dashboard.abandonedRegistrations.length
            }
          />
        </div>
      ) : null}

      {dashboard?.metrics.manualOverridesToday ? (
        <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2.5">
          <p className="text-xs font-medium text-amber-900">
            Manual overrides today: {dashboard.metrics.manualOverridesToday.total}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-800">
            {dashboard.metrics.manualOverridesToday.forceCheckIns} force check-ins ·{" "}
            {dashboard.metrics.manualOverridesToday.forceCheckOuts} force check-outs
          </p>
        </div>
      ) : null}

      <ReceptionCommandFastActions onScanQr={onScanQr} onSearch={onFocusSearch} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardSection
          title="Pending approvals"
          subtitle="Pre-visit and check-in approvals"
          loading={loading && !dashboard}
          isEmpty={!dashboard || dashboard.pendingApprovals.length === 0}
          emptyMessage="No pending approvals"
        >
          {dashboard?.pendingApprovals.map((row) => (
            <PendingApprovalRow
              key={row.visitId}
              row={row}
              busy={busyVisitId === row.visitId}
              onOpenApproval={handleOpenApproval}
              onOpenVisitor360={onOpenVisitor360}
              onOpenVisitDetails={onOpenVisitDetails}
              {...overrideRowProps}
            />
          ))}
        </DashboardSection>

        <DashboardSection
          title="Expected arrivals"
          subtitle="Starting within the next 2 hours"
          loading={loading && !dashboard}
          isEmpty={!dashboard || dashboard.expectedArrivals.length === 0}
          emptyMessage="No expected arrivals in the next 2 hours"
        >
          {dashboard?.expectedArrivals.map((row) => (
            <VisitRow
              key={row.visitId}
              row={row}
              busy={busyVisitId === row.visitId}
              scheduledLabel={formatTime(row.scheduledAt)}
              onCheckIn={onCheckIn}
              onCheckOut={onCheckOut}
              onPrintBadge={onPrintBadge}
              onOpenVisitor360={onOpenVisitor360}
              onOpenVisitDetails={onOpenVisitDetails}
              {...overrideRowProps}
            />
          ))}
        </DashboardSection>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardSection
          title="Currently checked in"
          subtitle="Visitors on-site right now"
          loading={loading && !dashboard}
          isEmpty={!dashboard || dashboard.currentlyCheckedIn.length === 0}
          emptyMessage="No visitors currently on-site"
        >
          {dashboard?.currentlyCheckedIn.map((row) => (
            <VisitRow
              key={row.visitId}
              row={row}
              busy={busyVisitId === row.visitId}
              scheduledLabel={formatTime(row.checkedInAt)}
              extra={
                <span className="text-[11px] text-[var(--muted)]">
                  On-site {formatDuration(row.durationMinutes)}
                </span>
              }
              onCheckIn={onCheckIn}
              onCheckOut={onCheckOut}
              onPrintBadge={onPrintBadge}
              onOpenVisitor360={onOpenVisitor360}
              onOpenVisitDetails={onOpenVisitDetails}
              {...overrideRowProps}
            />
          ))}
        </DashboardSection>

        <DashboardSection
          title="Overdue visitors"
          subtitle="Past expected departure time"
          loading={loading && !dashboard}
          isEmpty={!dashboard || dashboard.overdueVisitors.length === 0}
          emptyMessage="No overdue visitors on-site"
        >
          {dashboard?.overdueVisitors.map((row) => (
            <VisitRow
              key={row.visitId}
              row={row}
              busy={busyVisitId === row.visitId}
              extra={
                <span className="text-[11px] font-medium text-amber-700">
                  Overdue {formatDuration(row.overdueMinutes)}
                </span>
              }
              onCheckIn={onCheckIn}
              onCheckOut={onCheckOut}
              onPrintBadge={onPrintBadge}
              onOpenVisitor360={onOpenVisitor360}
              onOpenVisitDetails={onOpenVisitDetails}
              canForceCheckIn={canForceCheckIn}
              onForceCheckIn={onForceCheckIn}
            />
          ))}
        </DashboardSection>
      </div>

      <RecentVisitorsPanel
        refreshNonce={refreshNonce}
        busyVisitId={busyVisitId}
        onOpenVisitor360={onOpenVisitor360}
        onOpenVisitHistory={(visitId) =>
          onOpenVisitHistory?.(visitId) ?? onOpenVisitDetails(visitId, "audit")
        }
        onCheckIn={onCheckIn}
        onPrintBadge={onPrintBadge}
      />
    </div>
  );
});
