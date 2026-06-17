"use client";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isVisitAwaitingApproval } from "@/lib/visits/actions";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import {
  kioskConfirmCard,
  kioskConfirmMeta,
  kioskConfirmName,
  kioskConfirmPrompt,
  kioskTouchGhost,
  kioskTouchPrimary,
  kioskTouchSecondary,
} from "@/components/kiosk/kiosk-ui";
import {
  kioskVisitMetaLine,
  kioskVisitorName,
} from "@/lib/kiosk/visit-display";
import { cn } from "@/lib/utils/cn";

import { canCheckInVisit, canCheckOutVisit } from "@/lib/visits/actions";

function canCheckIn(status: string) {
  return canCheckInVisit(status);
}

function canCheckOut(status: string) {
  return canCheckOutVisit(status);
}

export function KioskConfirmCardShell({
  name,
  metaLine,
  badge,
  details,
  children,
  className,
}: {
  name: string;
  metaLine: string;
  badge: React.ReactNode;
  details?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(kioskConfirmCard, className)}>
      <h2 className={kioskConfirmName}>{name}</h2>
      <p className={kioskConfirmMeta}>{metaLine}</p>
      <div className="mt-4 flex justify-center lg:mt-5">{badge}</div>
      {details}
      {children}
    </div>
  );
}

function VisitDetailsList({ visit }: { visit: VisitWithRelations }) {
  return (
    <dl className="mt-5 space-y-2 border-t border-[var(--border)] pt-5 text-base text-[var(--muted)] lg:mt-6 lg:pt-6">
      {visit.scheduledAt ? (
        <div className="flex justify-between gap-4">
          <dt>Scheduled</dt>
          <dd className="font-medium text-[var(--foreground)]">
            {new Date(visit.scheduledAt).toLocaleString()}
          </dd>
        </div>
      ) : null}
      {visit.purpose ? (
        <div className="flex justify-between gap-4">
          <dt>Purpose</dt>
          <dd className="font-medium text-[var(--foreground)]">{visit.purpose}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function KioskVisitConfirmCard({
  visit,
  showDetails,
  onToggleDetails,
  onCheckIn,
  onCheckOut,
  onCancel,
  executing,
  cancelLabel = "Cancel",
}: {
  visit: VisitWithRelations;
  showDetails: boolean;
  onToggleDetails: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onCancel: () => void;
  executing: boolean;
  cancelLabel?: string;
}) {
  const awaiting = isVisitAwaitingApproval(visit.status);
  const checkInReady = canCheckIn(visit.status);
  const checkOutReady = canCheckOut(visit.status);
  const actionable = checkInReady || checkOutReady;

  return (
    <KioskConfirmCardShell
      name={kioskVisitorName(visit)}
      metaLine={kioskVisitMetaLine(visit)}
      badge={<StatusBadge status={visit.status} />}
      details={showDetails ? <VisitDetailsList visit={visit} /> : null}
    >
      {awaiting ? (
        <div className="mt-6 text-center lg:mt-8">
          <p className="text-xl font-medium text-amber-800 lg:text-2xl">
            Awaiting approval
          </p>
          <Button
            type="button"
            variant="secondary"
            className={cn("mt-6 w-full lg:mt-8", kioskTouchPrimary)}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        </div>
      ) : actionable ? (
        <div className="mt-6 lg:mt-8">
          <p className={kioskConfirmPrompt}>What would you like to do?</p>
          <div className="flex flex-col gap-3">
            {checkInReady && onCheckIn ? (
              <Button
                type="button"
                className={kioskTouchPrimary}
                disabled={executing}
                onClick={onCheckIn}
              >
                {executing ? "Working…" : "Check In"}
              </Button>
            ) : null}
            {checkOutReady && onCheckOut ? (
              <Button
                type="button"
                className={kioskTouchPrimary}
                disabled={executing}
                onClick={onCheckOut}
              >
                {executing ? "Working…" : "Check Out"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className={kioskTouchSecondary}
              disabled={executing}
              onClick={onToggleDetails}
            >
              {showDetails ? "Hide Details" : "View Details"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={kioskTouchGhost}
              disabled={executing}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 lg:mt-8">
          <p className="text-center text-base text-[var(--muted)] lg:text-lg">
            This visit cannot be checked in or out from here.
          </p>
          <Button
            type="button"
            variant="secondary"
            className={cn("mt-5 w-full lg:mt-6", kioskTouchPrimary)}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        </div>
      )}
    </KioskConfirmCardShell>
  );
}

export function KioskConfirmOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/40 p-4 pb-8 backdrop-blur-md sm:items-center sm:p-6 sm:pb-10">
      {children}
    </div>
  );
}

export function KioskRegistrationReviewCard({
  displayName,
  metaLine,
  contactLine,
  purpose,
  documentCount,
  photoUrl,
  executing,
  onSubmit,
  onBack,
}: {
  displayName: string;
  metaLine: string;
  contactLine: string;
  purpose: string;
  documentCount: number;
  photoUrl: string | null;
  executing: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <KioskConfirmCardShell
      name={displayName || "New visitor"}
      metaLine={metaLine}
      badge={
        <span className="rounded-full bg-[var(--surface-muted)] px-4 py-1.5 text-sm font-medium text-[var(--foreground)]">
          Review registration
        </span>
      }
      details={
        <dl className="mt-5 space-y-2 border-t border-[var(--border)] pt-5 text-base text-[var(--muted)] lg:mt-6 lg:pt-6">
          <div className="flex justify-between gap-4">
            <dt>Contact</dt>
            <dd className="font-medium text-[var(--foreground)]">{contactLine || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Purpose</dt>
            <dd className="font-medium text-[var(--foreground)]">{purpose || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Documents</dt>
            <dd className="font-medium text-[var(--foreground)]">
              {documentCount === 0
                ? "None"
                : `${documentCount} file${documentCount === 1 ? "" : "s"}`}
            </dd>
          </div>
        </dl>
      }
    >
      {photoUrl ? (
        <div className="mt-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Visitor photo preview"
            className="h-20 w-20 rounded-2xl border border-[var(--border)] object-cover lg:h-24 lg:w-24"
          />
        </div>
      ) : null}

      <div className="mt-6 lg:mt-8">
        <p className={kioskConfirmPrompt}>Confirm your details before submitting.</p>
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            className={kioskTouchPrimary}
            disabled={executing}
            onClick={onSubmit}
          >
            {executing ? "Submitting…" : "Submit"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={kioskTouchGhost}
            disabled={executing}
            onClick={onBack}
          >
            Back to edit
          </Button>
        </div>
      </div>
    </KioskConfirmCardShell>
  );
}
