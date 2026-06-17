"use client";

import { memo } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DetailRow,
  SectionCard,
  SummaryStatusCard,
} from "@/components/visits/visit-details-shared";
import { VisitStatus } from "@prisma/client";
import {
  canCheckInVisit,
  canCheckOutVisit,
  canForceCheckInVisit,
  canForceCheckOutVisit,
  canGenerateVisitQr,
  canPrintVisitBadge,
  isVisitAwaitingApproval,
} from "@/lib/visits/actions";
import {
  formatVisitDateTime,
  resolveCheckInMedia,
  resolveVisitApprovalFlags,
} from "@/lib/visits/visit-detail-display";
import { resolveHostDisplayNameFromVisit } from "@/lib/hosts/display";
import type { ThermalBadgeData, VisitDetail } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

function isQrExpired(expiresAt: string | Date | null | undefined) {
  if (!expiresAt) {
    return false;
  }
  return new Date(expiresAt).getTime() < Date.now();
}

function resolveApprovalSummary(visit: VisitDetail) {
  const { requireApproval } = resolveVisitApprovalFlags(visit);

  if (!requireApproval) {
    return { label: "Not required", tone: "muted" as const };
  }
  if (visit.status === VisitStatus.PENDING) {
    return { label: "Pending", tone: "warning" as const };
  }
  if (visit.status === VisitStatus.REJECTED) {
    return { label: "Rejected", tone: "danger" as const };
  }
  if (
    visit.status === VisitStatus.APPROVED ||
    visit.status === VisitStatus.CHECKED_IN ||
    visit.status === VisitStatus.CHECKED_OUT
  ) {
    return { label: "Approved", tone: "success" as const };
  }
  return { label: "Required", tone: "default" as const };
}

function resolveCheckInSummary(visit: VisitDetail) {
  if (visit.status === VisitStatus.CHECKED_IN) {
    return { label: "On site", tone: "success" as const };
  }
  if (visit.status === VisitStatus.CHECKED_OUT) {
    return { label: "Checked out", tone: "muted" as const };
  }
  if (visit.status === VisitStatus.APPROVED) {
    return { label: "Not checked in", tone: "default" as const };
  }
  if (visit.status === VisitStatus.PENDING) {
    return { label: "Awaiting approval", tone: "warning" as const };
  }
  if (visit.status === VisitStatus.REJECTED) {
    return { label: "Not checked in", tone: "danger" as const };
  }
  return { label: "—", tone: "muted" as const };
}

function resolveQrSummary(visit: VisitDetail, qrExpired: boolean) {
  if (!visit.qrToken) {
    return { label: "Not issued", tone: "muted" as const };
  }
  if (qrExpired) {
    return { label: "Expired", tone: "warning" as const };
  }
  return { label: "Active", tone: "success" as const };
}

function resolveBadgeSummary(visit: VisitDetail) {
  if (visit.badgeNumber) {
    return { label: visit.badgeNumber, tone: "success" as const };
  }
  if (visit.status === VisitStatus.CHECKED_IN) {
    return { label: "Pending issue", tone: "warning" as const };
  }
  return { label: "Not issued", tone: "muted" as const };
}

export const VisitDetailsOverviewTab = memo(function VisitDetailsOverviewTab({
  visit,
  actionLoading,
  showApprovalTab,
  onCheckIn,
  onCheckOut,
  onGenerateQr,
  onPrintBadge,
  onReviewApproval,
  canForceCheckIn = false,
  canForceCheckOut = false,
  onForceCheckIn,
  onForceCheckOut,
}: {
  visit: VisitDetail;
  actionLoading: boolean;
  showApprovalTab: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onGenerateQr: (visit: VisitWithRelations) => void;
  onPrintBadge: (
    visit: VisitWithRelations,
    badge?: ThermalBadgeData | null,
  ) => void;
  onReviewApproval: () => void;
  canForceCheckIn?: boolean;
  canForceCheckOut?: boolean;
  onForceCheckIn?: () => void;
  onForceCheckOut?: () => void;
}) {
  const media = resolveCheckInMedia(visit);
  const photoUrl = media.photoUrl ?? visit.visitor.photoUrl;
  const qrExpired = visit.qrToken ? isQrExpired(visit.qrExpiresAt) : false;
  const pendingApproval = isVisitAwaitingApproval(visit.status);
  const approvalSummary = resolveApprovalSummary(visit);
  const checkInSummary = resolveCheckInSummary(visit);
  const qrSummary = resolveQrSummary(visit, qrExpired);
  const badgeSummary = resolveBadgeSummary(visit);
  const visitorName = `${visit.visitor.firstName} ${visit.visitor.lastName}`.trim();
  const scheduledLabel = visit.scheduledAt
    ? formatVisitDateTime(visit.scheduledAt)
    : "Walk-in";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-[var(--muted)]">
                  {visit.visitor.firstName.charAt(0)}
                  {visit.visitor.lastName.charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">{visitorName}</h3>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {visit.visitor.company ?? "No company listed"}
              </p>
              {(visit.visitor.email || visit.visitor.phone) && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {[visit.visitor.email, visit.visitor.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          </div>

          <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <DetailRow
              label="Status"
              value={<StatusBadge status={visit.status} />}
            />
            <DetailRow
              label="Host"
              value={resolveHostDisplayNameFromVisit(visit)}
            />
            <DetailRow label="Branch" value={visit.branch.name} />
            <DetailRow
              label="Badge number"
              value={visit.badgeNumber ?? "—"}
            />
            <DetailRow label="Scheduled" value={scheduledLabel} />
            <DetailRow label="Purpose" value={visit.purpose ?? "—"} />
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryStatusCard
          label="Approval status"
          value={approvalSummary.label}
          tone={approvalSummary.tone}
        />
        <SummaryStatusCard
          label="Check-in status"
          value={checkInSummary.label}
          tone={checkInSummary.tone}
        />
        <SummaryStatusCard
          label="QR status"
          value={qrSummary.label}
          tone={qrSummary.tone}
        />
        <SummaryStatusCard
          label="Badge status"
          value={badgeSummary.label}
          tone={badgeSummary.tone}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {canCheckInVisit(visit.status) ? (
          <Button
            type="button"
            size="sm"
            loading={actionLoading}
            disabled={actionLoading}
            onClick={onCheckIn}
          >
            {actionLoading ? "Checking in…" : "Check in"}
          </Button>
        ) : null}
        {canCheckOutVisit(visit.status) ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={actionLoading}
            disabled={actionLoading}
            onClick={onCheckOut}
          >
            {actionLoading ? "Checking out…" : "Check out"}
          </Button>
        ) : null}
        {canForceCheckIn &&
        onForceCheckIn &&
        canForceCheckInVisit(visit.status) ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
            disabled={actionLoading}
            onClick={onForceCheckIn}
          >
            Force check-in
          </Button>
        ) : null}
        {canForceCheckOut &&
        onForceCheckOut &&
        canForceCheckOutVisit(visit.status) ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
            disabled={actionLoading}
            onClick={onForceCheckOut}
          >
            Force check-out
          </Button>
        ) : null}
        {canGenerateVisitQr(visit.status) ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={actionLoading}
            onClick={() => onGenerateQr(visit)}
          >
            {visit.qrToken ? "View QR" : "Generate QR"}
          </Button>
        ) : null}
        {canPrintVisitBadge(visit.status) ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={actionLoading}
            onClick={() => onPrintBadge(visit)}
          >
            Print badge
          </Button>
        ) : null}
        {pendingApproval && showApprovalTab ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={actionLoading}
            onClick={onReviewApproval}
          >
            Review approval
          </Button>
        ) : null}
      </div>

      <SectionCard title="Contact">
        <DetailRow label="Email" value={visit.visitor.email ?? "—"} />
        <DetailRow label="Phone" value={visit.visitor.phone ?? "—"} />
      </SectionCard>
    </div>
  );
});
