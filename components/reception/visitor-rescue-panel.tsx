"use client";

import { memo } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import {
  receptionCard,
  receptionCardBody,
  receptionCardHeader,
  receptionCardSubtitle,
  receptionCardTitle,
  receptionCompactButton,
  receptionSectionLabel,
} from "@/components/reception/reception-ui";
import { Button } from "@/components/ui/button";
import { VisitStatus } from "@prisma/client";
import type {
  KioskRecoveryStep,
  ReceptionAbandonedRegistration,
  ReceptionFailedKioskSession,
} from "@/lib/api/reception";
import {
  canForceCheckInVisit,
  canForceCheckOutVisit,
} from "@/lib/visits/actions";
import { cn } from "@/lib/utils/cn";

const RECOVERY_STEP_LABELS: Record<KioskRecoveryStep, string> = {
  identity: "Identity confirmation",
  capture: "Photo & documents",
  review: "Review & check in",
  approval_wait: "Awaiting approval",
};

const ABANDONED_STAGE_LABELS: Record<
  ReceptionAbandonedRegistration["progressStage"],
  string
> = {
  registration: "Registration started",
  capture: "Capture incomplete",
  review: "Review not submitted",
};

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function visitorName(visitor: { firstName: string; lastName: string }) {
  return `${visitor.firstName} ${visitor.lastName}`;
}

export interface VisitorRescuePanelProps {
  failedKioskSessions: ReceptionFailedKioskSession[];
  abandonedRegistrations: ReceptionAbandonedRegistration[];
  loading?: boolean;
  busyVisitId?: string | null;
  onResumeKiosk: (visitId: string, step: KioskRecoveryStep) => void;
  onOpenVisit: (visitId: string) => void;
  onCancelSession: (visitId: string) => void;
  onResumeRegistration: (
    visitId: string,
    stage: ReceptionAbandonedRegistration["progressStage"],
  ) => void;
  onCompleteAtReception: (visitId: string) => void;
  onCancelRegistration: (visitId: string) => void;
  canForceCheckIn?: boolean;
  canForceCheckOut?: boolean;
  onForceCheckIn?: (visitId: string) => void;
  onForceCheckOut?: (visitId: string) => void;
}

function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-md bg-[var(--surface-muted)]"
        />
      ))}
    </div>
  );
}

const FailedSessionRow = memo(function FailedSessionRow({
  session,
  busy,
  onResumeKiosk,
  onOpenVisit,
  onCancelSession,
  canForceCheckIn,
  onForceCheckIn,
}: {
  session: ReceptionFailedKioskSession;
  busy: boolean;
  onResumeKiosk: VisitorRescuePanelProps["onResumeKiosk"];
  onOpenVisit: VisitorRescuePanelProps["onOpenVisit"];
  onCancelSession: VisitorRescuePanelProps["onCancelSession"];
  canForceCheckIn?: boolean;
  onForceCheckIn?: (visitId: string) => void;
}) {
  const name = visitorName(session.visitor);

  return (
    <div className="border-b border-[var(--border)] px-2 py-2 last:border-b-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{name}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Last step: {RECOVERY_STEP_LABELS[session.lastKioskStep]}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            {formatWhen(session.lastActivityAt)} · {session.branch.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={receptionCompactButton}
            disabled={busy}
            onClick={() => onResumeKiosk(session.visitId, session.lastKioskStep)}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Resume
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={receptionCompactButton}
            disabled={busy}
            onClick={() => onOpenVisit(session.visitId)}
          >
            Open visit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={receptionCompactButton}
            disabled={busy}
            onClick={() => onCancelSession(session.visitId)}
          >
            Cancel session
          </Button>
          {canForceCheckIn &&
          onForceCheckIn &&
          canForceCheckInVisit(session.status) ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={receptionCompactButton}
              disabled={busy}
              onClick={() => onForceCheckIn(session.visitId)}
            >
              Force check-in
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
});

const AbandonedRegistrationRow = memo(function AbandonedRegistrationRow({
  registration,
  busy,
  onResumeRegistration,
  onCompleteAtReception,
  onCancelRegistration,
  canForceCheckIn,
  onForceCheckIn,
}: {
  registration: ReceptionAbandonedRegistration;
  busy: boolean;
  onResumeRegistration: VisitorRescuePanelProps["onResumeRegistration"];
  onCompleteAtReception: VisitorRescuePanelProps["onCompleteAtReception"];
  onCancelRegistration: VisitorRescuePanelProps["onCancelRegistration"];
  canForceCheckIn?: boolean;
  onForceCheckIn?: (visitId: string) => void;
}) {
  const name = visitorName(registration.visitor);

  return (
    <div className="border-b border-[var(--border)] px-2 py-2 last:border-b-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{name}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {ABANDONED_STAGE_LABELS[registration.progressStage]}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            Started {formatWhen(registration.startedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={receptionCompactButton}
            disabled={busy}
            onClick={() =>
              onResumeRegistration(
                registration.visitId,
                registration.progressStage,
              )
            }
          >
            Resume registration
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={receptionCompactButton}
            disabled={busy}
            onClick={() => onCompleteAtReception(registration.visitId)}
          >
            Complete at reception
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={receptionCompactButton}
            disabled={busy}
            onClick={() => onCancelRegistration(registration.visitId)}
          >
            Cancel
          </Button>
          {canForceCheckIn &&
          onForceCheckIn &&
          canForceCheckInVisit(registration.status) ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={receptionCompactButton}
              disabled={busy}
              onClick={() => onForceCheckIn(registration.visitId)}
            >
              Force check-in
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export const VisitorRescuePanel = memo(function VisitorRescuePanel({
  failedKioskSessions,
  abandonedRegistrations,
  loading = false,
  busyVisitId = null,
  onResumeKiosk,
  onOpenVisit,
  onCancelSession,
  onResumeRegistration,
  onCompleteAtReception,
  onCancelRegistration,
  canForceCheckIn = false,
  canForceCheckOut = false,
  onForceCheckIn,
  onForceCheckOut,
}: VisitorRescuePanelProps) {
  const hasRescueItems =
    failedKioskSessions.length > 0 || abandonedRegistrations.length > 0;

  return (
    <section className={receptionCard}>
      <div className={receptionCardHeader}>
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className={receptionCardTitle}>Visitor rescue queue</h2>
            <p className={receptionCardSubtitle}>
              Recover interrupted kiosk sessions and incomplete walk-in registrations
            </p>
          </div>
        </div>
      </div>

      <div className={cn(receptionCardBody, "space-y-4")}>
        <div>
          <h3 className={cn("mb-2", receptionSectionLabel)}>
            Failed kiosk sessions
          </h3>
          {loading ? (
            <LoadingRows />
          ) : failedKioskSessions.length === 0 ? (
            <p className="rounded-md border border-[var(--border)] px-3 py-3 text-center text-xs text-[var(--muted)]">
              No failed kiosk sessions in the last 24 hours
            </p>
          ) : (
            <div className="rounded-md border border-[var(--border)]">
              {failedKioskSessions.map((session) => (
                <FailedSessionRow
                  key={session.visitId}
                  session={session}
                  busy={busyVisitId === session.visitId}
                  onResumeKiosk={onResumeKiosk}
                  onOpenVisit={onOpenVisit}
                  onCancelSession={onCancelSession}
                  canForceCheckIn={canForceCheckIn}
                  onForceCheckIn={onForceCheckIn}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className={cn("mb-2", receptionSectionLabel)}>
            Abandoned registrations
          </h3>
          {loading ? (
            <LoadingRows />
          ) : abandonedRegistrations.length === 0 ? (
            <p className="rounded-md border border-[var(--border)] px-3 py-3 text-center text-xs text-[var(--muted)]">
              No abandoned walk-in registrations
            </p>
          ) : (
            <div className="rounded-md border border-[var(--border)]">
              {abandonedRegistrations.map((registration) => (
                <AbandonedRegistrationRow
                  key={registration.visitId}
                  registration={registration}
                  busy={busyVisitId === registration.visitId}
                  onResumeRegistration={onResumeRegistration}
                  onCompleteAtReception={onCompleteAtReception}
                  onCancelRegistration={onCancelRegistration}
                  canForceCheckIn={canForceCheckIn}
                  onForceCheckIn={onForceCheckIn}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && !hasRescueItems ? (
          <p className="text-center text-xs text-[var(--muted)]">
            All visitor flows are on track
          </p>
        ) : null}
      </div>
    </section>
  );
});
