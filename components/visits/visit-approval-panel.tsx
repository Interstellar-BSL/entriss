"use client";

import { useSession } from "next-auth/react";
import { memo, useCallback, useMemo, useRef, useState } from "react";

import { VisitStatus } from "@prisma/client";
import { VisitTimeline } from "@/components/visits/visit-timeline";
import { DetailRow } from "@/components/visits/visit-details-shared";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { approveVisit, rejectVisit } from "@/lib/api/approvals";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { isVisitAwaitingApproval } from "@/lib/visits/actions";
import {
  buildApprovalTimeline,
  formatVisitDateTime,
  resolveVisitApprovalDetail,
} from "@/lib/visits/visit-detail-display";
import type { VisitDetail } from "@/lib/visits/types";

function hasAnyPermission(
  permissions: string[] | undefined,
  candidates: string[],
) {
  const set = new Set(permissions ?? []);
  return candidates.some((permission) => set.has(permission));
}

export const VisitApprovalPanel = memo(function VisitApprovalPanel({
  visit,
  onActionComplete,
}: {
  visit: VisitDetail;
  onActionComplete?: () => Promise<void>;
}) {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const pending = isVisitAwaitingApproval(visit.status);
  const approval = resolveVisitApprovalDetail(visit);

  const approvalTimeline = useMemo(() => {
    return buildApprovalTimeline(visit).filter((entry) => {
      const label = entry.label.toLowerCase();
      return (
        label.includes("approval requested") ||
        label.includes("visit approved") ||
        label.includes("approval approved") ||
        label.includes("approval rejected")
      );
    });
  }, [visit]);

  const canApprove = hasAnyPermission(permissions, [
    PERMISSIONS.VISIT_APPROVE_PRE_VISIT,
    PERMISSIONS.VISIT_APPROVE,
  ]);
  const canReject = hasAnyPermission(permissions, [
    PERMISSIONS.VISIT_REJECT,
  ]);

  const [acting, setActing] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actionLockRef = useRef(false);

  const rejectionReason =
    visit.status === VisitStatus.REJECTED ? approval.comments : null;
  const comments =
    visit.status === VisitStatus.REJECTED ? null : approval.comments;

  const handleApprove = useCallback(async () => {
    if (actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setActing("approve");
    setError(null);

    try {
      await approveVisit(visit.id);
      await onActionComplete?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Approval failed.",
      );
    } finally {
      actionLockRef.current = false;
      setActing(null);
    }
  }, [onActionComplete, visit.id]);

  const handleReject = useCallback(async () => {
    if (actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setActing("reject");
    setError(null);

    try {
      await rejectVisit(visit.id);
      await onActionComplete?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Rejection failed.",
      );
    } finally {
      actionLockRef.current = false;
      setActing(null);
    }
  }, [onActionComplete, visit.id]);

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Approval
        </h3>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailRow
              label="Approval required"
              value={approval.approvalRequired ? "Yes" : "No"}
            />
            <DetailRow
              label="Current approval status"
              value={approval.currentStatus}
            />
            {approval.requestedOn ? (
              <DetailRow
                label="Requested date"
                value={formatVisitDateTime(approval.requestedOn)}
              />
            ) : null}
            {approval.approvedBy ? (
              <DetailRow label="Approved by" value={approval.approvedBy} />
            ) : null}
            {approval.approvedOn ? (
              <DetailRow
                label="Approved date"
                value={formatVisitDateTime(approval.approvedOn)}
              />
            ) : null}
            {rejectionReason ? (
              <div className="sm:col-span-2">
                <DetailRow label="Rejection reason" value={rejectionReason} />
              </div>
            ) : null}
            {comments ? (
              <div className="sm:col-span-2">
                <DetailRow label="Comments" value={comments} />
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {pending && (canApprove || canReject) ? (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            {canApprove ? (
              <Button
                type="button"
                size="sm"
                loading={acting === "approve"}
                disabled={acting !== null}
                onClick={() => void handleApprove()}
              >
                {acting === "approve" ? "Approving…" : "Approve"}
              </Button>
            ) : null}
            {canReject ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={acting === "reject"}
                disabled={acting !== null}
                onClick={() => void handleReject()}
              >
                {acting === "reject" ? "Rejecting…" : "Reject"}
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {approvalTimeline.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Timeline
          </h3>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-4">
            <VisitTimeline entries={approvalTimeline} />
          </div>
        </section>
      ) : null}
    </div>
  );
});
