import { VisitStatus } from "@/app/generated/prisma/enums";

import { normalizeVisitorApprovalFields } from "@/lib/settings/approval-normalize";
import type { VisitApprovalRecord, VisitEventRecord } from "@/lib/services/internal/visit-include";
import {
  extractCheckInMediaFromVisit,
  type VisitCheckInMediaRecord,
} from "@/lib/visits/check-in-media";
import type { VisitDetail, VisitTimelineEntry } from "@/lib/visits/types";

export type { VisitCheckInMediaRecord };

export interface VisitApprovalFlags {
  requireApproval: boolean;
}

export interface VisitApprovalDetail {
  currentStatus: string;
  approvalRequired: boolean;
  requestedOn: string | null;
  approvedBy: string | null;
  approvedOn: string | null;
  rejectedBy: string | null;
  rejectedOn: string | null;
  comments: string | null;
}

/** Normalized check-in capture media for Visit Details UI. */
export function resolveCheckInMedia(visit: VisitDetail): VisitCheckInMediaRecord {
  return extractCheckInMediaFromVisit({
    visitor: visit.visitor,
    events: visit.events,
    checkIn: visit.checkIn,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function formatStatusLabel(status: VisitStatus | string): string {
  return String(status).replace(/_/g, " ");
}

function actorName(
  record: VisitApprovalRecord | null | undefined,
): string | null {
  if (!record) {
    return null;
  }
  return record.approver.user.name ?? record.approver.user.email;
}

/** Derive approval policy flags from visit payload (no extra API calls). */
export function resolveVisitApprovalFlags(visit: VisitDetail): VisitApprovalFlags {
  const orgSettings = asRecord(visit.organization?.settings);
  const visitorConfig = asRecord(orgSettings?.visitor);
  const configBlock = asRecord(orgSettings?.config);
  const visitorFromConfig = asRecord(configBlock?.visitor);

  const normalized = normalizeVisitorApprovalFields({
    requiresApproval:
      typeof orgSettings?.requiresApproval === "boolean"
        ? orgSettings.requiresApproval
        : typeof visitorConfig?.requiresApproval === "boolean"
          ? visitorConfig.requiresApproval
          : typeof visitorFromConfig?.requiresApproval === "boolean"
            ? visitorFromConfig.requiresApproval
            : visit.branch?.requiresApproval,
  });

  return {
    requireApproval: normalized.requiresApproval,
  };
}

export function shouldShowApprovalTab(visit: VisitDetail): boolean {
  const flags = resolveVisitApprovalFlags(visit);
  return (
    flags.requireApproval ||
    visit.status === VisitStatus.PENDING ||
    visit.status === VisitStatus.REJECTED ||
    (visit.approvals?.length ?? 0) > 0
  );
}

export function resolveVisitApprovalDetail(visit: VisitDetail): VisitApprovalDetail {
  const flags = resolveVisitApprovalFlags(visit);
  const approvals = visit.approvals ?? [];
  const pending = approvals.find((record) => record.status === "PENDING");
  const approved = approvals.find((record) => record.decision === "APPROVED");
  const rejected = approvals.find((record) => record.decision === "REJECTED");

  const requestedEvent = (visit.events ?? []).find((event) => {
    if (event.type !== "status_changed") {
      return false;
    }
    const payload = asRecord(event.payload);
    return payload?.to === VisitStatus.PENDING;
  });

  const comments =
    approved?.notes?.trim() ||
    rejected?.notes?.trim() ||
    null;

  return {
    currentStatus: formatStatusLabel(visit.status),
    approvalRequired: flags.requireApproval,
    requestedOn: pending
      ? String(pending.createdAt)
      : requestedEvent
        ? String(requestedEvent.createdAt)
        : visit.status === VisitStatus.PENDING
          ? visit.updatedAt
          : null,
    approvedBy:
      visit.status === VisitStatus.APPROVED ||
      visit.status === VisitStatus.CHECKED_IN ||
      visit.status === VisitStatus.CHECKED_OUT
        ? actorName(approved)
        : null,
    approvedOn: approved?.decidedAt
      ? String(approved.decidedAt)
      : visit.status === VisitStatus.APPROVED && !approved
        ? visit.updatedAt
        : null,
    rejectedBy:
      visit.status === VisitStatus.REJECTED ? actorName(rejected) : null,
    rejectedOn: rejected?.decidedAt ? String(rejected.decidedAt) : null,
    comments,
  };
}

export function resolveVisitType(visit: VisitDetail): string {
  if (visit.scheduledAt) {
    return "Scheduled";
  }
  return "Walk-in";
}

export function formatVisitDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatVisitTime(value: string | Date | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatVisitDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatVisitDuration(
  checkedInAt: string | Date | null | undefined,
  checkedOutAt: string | Date | null | undefined,
): string {
  if (!checkedInAt) {
    return "—";
  }

  const start = new Date(checkedInAt).getTime();
  const end = checkedOutAt ? new Date(checkedOutAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60_000));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function findQrScanTime(events: VisitEventRecord[] | undefined): string | null {
  const match = (events ?? []).find((event) => event.type === "visit.checked_in.qr");
  return match ? String(match.createdAt) : null;
}

export function buildStatusProgress(visit: VisitDetail): VisitTimelineEntry[] {
  const steps: VisitTimelineEntry[] = [];

  if (visit.scheduledAt) {
    steps.push({
      id: "scheduled",
      label: "Scheduled",
      timestamp: String(visit.scheduledAt),
      kind: "info",
    });
  }

  const approvedEvent = (visit.events ?? []).find((event) => {
    if (event.type !== "status_changed") {
      return false;
    }
    const payload = asRecord(event.payload);
    return payload?.to === VisitStatus.APPROVED;
  });

  if (
    visit.status === VisitStatus.APPROVED ||
    visit.checkedInAt ||
    approvedEvent
  ) {
    steps.push({
      id: "approved",
      label: "Approved",
      timestamp: approvedEvent
        ? String(approvedEvent.createdAt)
        : visit.checkedInAt
          ? null
          : visit.updatedAt,
      kind: "success",
    });
  }

  if (visit.checkedInAt) {
    steps.push({
      id: "checked_in",
      label: "Checked in",
      timestamp: String(visit.checkedInAt),
      kind: "success",
    });
  }

  if (visit.checkedOutAt) {
    steps.push({
      id: "checked_out",
      label: "Checked out",
      timestamp: String(visit.checkedOutAt),
      kind: "muted",
    });
  }

  return steps;
}

function approvalEventLabel(to: string): string {
  switch (to) {
    case VisitStatus.PENDING:
    case "PENDING_PRE_APPROVAL":
    case "AWAITING_APPROVAL":
      return "Approval requested";
    case VisitStatus.APPROVED:
      return "Visit approved";
    case VisitStatus.REJECTED:
      return "Approval rejected";
    case VisitStatus.CHECKED_IN:
      return "Checked in";
    default:
      return `Status changed to ${to.replace(/_/g, " ").toLowerCase()}`;
  }
}

export function buildApprovalTimeline(
  visit: VisitDetail,
): VisitTimelineEntry[] {
  const entries: VisitTimelineEntry[] = [];

  for (const event of visit.events ?? []) {
    const payload = asRecord(event.payload);
    if (event.type === "status_changed" && typeof payload?.to === "string") {
      const to = payload.to;
      if (
        to === VisitStatus.PENDING ||
        to === VisitStatus.APPROVED ||
        to === VisitStatus.REJECTED ||
        to === VisitStatus.CHECKED_IN ||
        to === "PENDING_PRE_APPROVAL" ||
        to === "AWAITING_APPROVAL"
      ) {
        entries.push({
          id: event.id,
          label: approvalEventLabel(to),
          timestamp: String(event.createdAt),
          kind:
            to === VisitStatus.REJECTED
              ? "warning"
              : to === VisitStatus.APPROVED || to === VisitStatus.CHECKED_IN
                ? "success"
                : "info",
          detail: event.actor?.name ?? event.actor?.email ?? undefined,
        });
      }
    }
  }

  for (const record of visit.approvals ?? []) {
    if (record.status === "PENDING") {
      continue;
    }

    entries.push({
      id: `approval-${record.id}`,
      label: `Approval ${record.decision?.toLowerCase() ?? record.status.toLowerCase()}`,
      timestamp: String(record.decidedAt ?? record.createdAt),
      kind: record.decision === "REJECTED" ? "warning" : "success",
      detail: record.approver.user.name ?? record.approver.user.email,
    });
  }

  return entries.sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return aTime - bTime;
  });
}
