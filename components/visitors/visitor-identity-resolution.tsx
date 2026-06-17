"use client";

import { Button } from "@/components/ui/button";
import type { VisitorRecord, VisitorVisitStats } from "@/lib/api/visitors";
import { detachVisitorRecord } from "@/lib/visits/detach";

function formatLastVisit(value: string | null) {
  if (!value) {
    return "No visits yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatContact(value: string | null, fallback = "—") {
  return value?.trim() ? value : fallback;
}

export function VisitorIdentityResolutionCard({
  existingVisitor,
  visitStats,
  onUseExisting,
  onCreateSeparate,
  onCancel,
  primaryActionLabel = "Use existing visitor",
  secondaryActionLabel = "Create separate visitor",
  isSubmitting = false,
}: {
  existingVisitor: VisitorRecord;
  visitStats?: VisitorVisitStats | null;
  onUseExisting: () => void;
  onCreateSeparate: () => void;
  onCancel?: () => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  isSubmitting?: boolean;
}) {
  const visitor = detachVisitorRecord(existingVisitor);
  const fullName = `${visitor.firstName} ${visitor.lastName}`.trim();

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-[var(--foreground)]">Existing visitor found</h3>
        <p className="text-sm text-[var(--muted)]">
          Someone in your organization already has this email or phone. Choose how to
          continue.
        </p>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Name</dt>
          <dd className="text-right font-medium text-[var(--foreground)]">{fullName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Email</dt>
          <dd className="text-right text-[var(--foreground)]">{formatContact(visitor.email)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Phone</dt>
          <dd className="text-right text-[var(--foreground)]">{formatContact(visitor.phone)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Company</dt>
          <dd className="text-right text-[var(--foreground)]">{formatContact(visitor.company)}</dd>
        </div>
        {visitStats ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Visit count</dt>
              <dd className="text-right text-[var(--foreground)]">{visitStats.visitCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Last visit</dt>
              <dd className="text-right text-[var(--foreground)]">
                {formatLastVisit(visitStats.lastVisitAt)}
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          onClick={onCreateSeparate}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Working…" : secondaryActionLabel}
        </Button>
        <Button type="button" onClick={onUseExisting} disabled={isSubmitting}>
          {isSubmitting ? "Working…" : primaryActionLabel}
        </Button>
      </div>
    </div>
  );
}
