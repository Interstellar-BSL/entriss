"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApprovalRequestCard } from "@/components/approvals/approval-request-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/visits/format-relative-time";
import {
  listApprovalQueue,
  type ApprovalQueueTab,
} from "@/lib/api/approvals";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { kioskHostLabel } from "@/lib/kiosk/visit-display";
import { cn } from "@/lib/utils/cn";

const TABS: Array<{ id: ApprovalQueueTab; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export function ApprovalsPage() {
  const [tab, setTab] = useState<ApprovalQueueTab>("pending");
  const [items, setItems] = useState<VisitWithRelations[]>([]);
  const [history, setHistory] = useState<
    Array<{ visit: VisitWithRelations; decision: string | null; decidedAt: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listApprovalQueue(tab, { limit: 50 });
      if (tab === "approved" || tab === "rejected") {
        setHistory(
          (result.items as Array<{
            visit: VisitWithRelations;
            approval: { decision: string | null; decidedAt: string | null };
          }>).map((item) => ({
            visit: item.visit,
            decision: item.approval.decision,
            decidedAt: item.approval.decidedAt,
          })),
        );
        setItems([]);
      } else {
        setItems(result.items as VisitWithRelations[]);
        setHistory([]);
      }
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load approval queue",
      );
      setItems([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const isPendingTab = tab === "pending";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">Approval management is available directly within Visit Details.</p>
        <p className="mt-1 text-blue-800">
          Select any visit below to open its approval tab, or browse all visits from the Visits page.
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Approvals
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Browse pending and completed approval requests.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-[var(--brand-primary)] text-[var(--on-brand)]"
                : "bg-[var(--surface-muted)] text-[var(--muted)] hover:bg-[var(--surface-muted)]",
            )}
          >
            {item.label}
          </button>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
        {lastUpdatedAt ? (
          <span className="text-xs text-[var(--muted)]">
            Updated {formatRelativeTime(lastUpdatedAt)}
          </span>
        ) : null}
      </div>

      {loading ? <TableSkeleton rows={4} /> : null}

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && isPendingTab && items.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="Visits requiring approval will appear here."
        />
      ) : null}

      {!loading && !error && isPendingTab
        ? items.map((visit) => (
            <ApprovalRequestCard key={visit.id} visit={visit} />
          ))
        : null}

      {!loading && !error && (tab === "approved" || tab === "rejected")
        ? history.map(({ visit, decision, decidedAt }) => (
            <Link
              key={visit.id}
              href={`/visits?visit=${visit.id}&tab=approval`}
              className="block rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {visit.visitor.firstName} {visit.visitor.lastName}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    Host: {kioskHostLabel(visit)}
                  </p>
                </div>
                <StatusBadge status={visit.status} />
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {decision ?? tab} ·{" "}
                {decidedAt ? formatRelativeTime(new Date(decidedAt)) : "—"}
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--link)]">
                Open in Visit Details →
              </p>
            </Link>
          ))
        : null}
    </div>
  );
}
