"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { KioskApprovalPending } from "@/components/kiosk/kiosk-approval-pending";
import { KioskPendingApprovalScreen } from "@/components/kiosk/kiosk-pending-approval-screen";
import { KioskBookingBadge } from "@/components/kiosk/kiosk-booking-badge";
import { KioskBookingCapture } from "@/components/kiosk/kiosk-booking-capture";
import { KioskBookingResultsList } from "@/components/kiosk/kiosk-booking-results";
import { KioskCheckoutConfirm } from "@/components/kiosk/kiosk-checkout-confirm";
import type { KioskCapturedDocument } from "@/components/kiosk/kiosk-document-upload";
import { KioskFlowFrame } from "@/components/kiosk/kiosk-flow-frame";
import { KioskResolvingHint } from "@/components/kiosk/kiosk-resolving-hint";
import { KioskResultScreen } from "@/components/kiosk/kiosk-result-screen";
import { KioskVisitIdentityConfirm } from "@/components/kiosk/kiosk-visit-identity-confirm";
import {
  KIOSK_ERROR_AUTO_RETURN_MS,
  KIOSK_SUCCESS_DISMISS_MS,
  kioskCompactButton,
  kioskCompactInput,
  kioskCompactSupporting,
  kioskCompactTitle,
  kioskFlowNarrow,
  kioskFlowWide,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { searchVisits } from "@/lib/api/visits";
import { validateKioskCapture } from "@/lib/kiosk/capture-validation";
import { useKioskOperational } from "@/lib/kiosk/kiosk-operational-context";
import { kioskHostLabel, kioskVisitorName } from "@/lib/kiosk/visit-display";
import {
  completeKioskApprovalOutcome,
  isPolicyCaptureErrorCode,
  kioskApprovalRejectionOutcome,
  runKioskCheckIn,
} from "@/lib/kiosk/kiosk-check-in-workflow";
import {
  loadVisitMedia,
  toKioskCapturedDocuments,
} from "@/lib/kiosk/visit-media";
import { checkOutVisit } from "@/lib/visits/visit-engine-client";
import {
  canCheckOutVisit,
  canKioskCheckInVisit,
  isVisitAwaitingCheckinApproval,
  isVisitAwaitingPreVisitApproval,
} from "@/lib/visits/actions";
import { isVisitCheckedIn } from "@/lib/visits/workflow-engine";
import type { ThermalBadgeData } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { cn } from "@/lib/utils/cn";

type FlowPhase =
  | "search"
  | "identity"
  | "confirm-checkout"
  | "capture"
  | "approval-wait"
  | "approval-pending"
  | "badge"
  | "result";

type ResultPayload =
  | {
      kind: "success";
      action: "check-in";
      visit: VisitWithRelations;
      badge?: ThermalBadgeData | null;
      showBadgePrinting: boolean;
      photoUrl?: string | null;
    }
  | {
      kind: "success";
      action: "check-out";
      visit: VisitWithRelations;
    }
  | { kind: "error"; message: string }
  | {
      kind: "policy-blocked";
      title: string;
      message: string;
    };

function phaseSubtitle(phase: FlowPhase) {
  switch (phase) {
    case "search":
      return "Search by name, email, or phone";
    case "identity":
      return "Confirm your identity";
    case "confirm-checkout":
      return "Confirm check-out";
    case "capture":
      return "Photo and documents";
    case "approval-wait":
      return "Waiting for approval";
    case "approval-pending":
      return "Awaiting approval";
    case "badge":
      return "Collect your badge";
    case "result":
      return "Visit complete";
    default:
      return "Search by name, email, or phone";
  }
}

export function KioskBookingFlow({
  onBack,
  onTryBooking,
}: {
  onBack: () => void;
  onTryBooking?: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const dismissTimerRef = useRef<number | null>(null);
  const { getForBranch } = useKioskOperational();

  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [visits, setVisits] = useState<VisitWithRelations[]>([]);
  const [resolving, setResolving] = useState(false);
  const [phase, setPhase] = useState<FlowPhase>("search");
  const [selectedVisit, setSelectedVisit] = useState<VisitWithRelations | null>(
    null,
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KioskCapturedDocument[]>([]);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [approvalVisit, setApprovalVisit] = useState<VisitWithRelations | null>(
    null,
  );

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const resetToSearch = useCallback(() => {
    clearDismissTimer();
    setPhase("search");
    setSelectedVisit(null);
    setPhotoUrl(null);
    setDocuments([]);
    setCaptureError(null);
    setExecuting(false);
    setResult(null);
    setApprovalVisit(null);
    setQuery("");
    setVisits([]);
    setHasSearched(false);
    setSearchError(null);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [clearDismissTimer]);

  const scheduleAutoReturn = useCallback(
    (delayMs: number, action: () => void) => {
      // Timer ownership: parent flows schedule auto-return; KioskResultScreen
      // does not own dismiss timers unless onAutoReturn is passed explicitly.
      clearDismissTimer();
      dismissTimerRef.current = window.setTimeout(action, delayMs);
    },
    [clearDismissTimer],
  );

  const advanceToResult = useCallback(() => {
    setPhase("result");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => searchRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => clearDismissTimer();
  }, [clearDismissTimer]);

  useEffect(() => {
    if (phase !== "result" || result?.kind !== "success") {
      return;
    }

    scheduleAutoReturn(KIOSK_SUCCESS_DISMISS_MS, resetToSearch);
    return () => clearDismissTimer();
  }, [phase, result, scheduleAutoReturn, resetToSearch, clearDismissTimer]);

  const operational = selectedVisit
    ? getForBranch(selectedVisit.branchId)
    : null;
  const requirePhoto = operational?.requireVisitorPhoto ?? false;
  const requireDocuments = operational?.requireVisitorDocuments ?? false;

  function handleFrameBack() {
    if (phase === "search") {
      onBack();
      return;
    }
    if (phase === "badge") {
      advanceToResult();
      return;
    }
    if (phase === "approval-pending" || phase === "approval-wait") {
      resetToSearch();
      return;
    }
    if (phase === "identity" || phase === "confirm-checkout") {
      setSelectedVisit(null);
      setPhase("search");
      return;
    }
    if (phase === "capture") {
      setPhotoUrl(null);
      setDocuments([]);
      setCaptureError(null);
      setPhase("identity");
    }
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearchError(null);
    setResolving(true);
    setHasSearched(true);

    const trimmed = query.trim();
    const criteria = trimmed.includes("@")
      ? { email: trimmed }
      : /^\+?[\d\s()-]{5,}$/.test(trimmed)
        ? { phone: trimmed }
        : { name: trimmed };

    try {
      const searchResult = await searchVisits(criteria);
      setVisits(searchResult.visits);
      if (searchResult.visits.length === 0) {
        setSearchError(
          "No bookings found. Try a different name, email, or phone number.",
        );
      }
    } catch (err) {
      setSearchError(err instanceof ApiError ? err.message : "Search failed.");
      setVisits([]);
    } finally {
      setResolving(false);
    }
  }

  function handleSelectVisit(visit: VisitWithRelations) {
    setSearchError(null);
    setSelectedVisit(visit);
    setPhotoUrl(null);
    setDocuments([]);
    setCaptureError(null);

    if (isVisitAwaitingPreVisitApproval(visit.status)) {
      setApprovalVisit(visit);
      setPhase("approval-wait");
      return;
    }

    setPhase("identity");
  }

  function handlePendingApproved(visit: VisitWithRelations) {
    setSelectedVisit(visit);
    setApprovalVisit(null);
    setPhotoUrl(null);
    setDocuments([]);
    setCaptureError(null);
    setPhase("identity");
  }

  function handlePendingRejected() {
    showErrorResult(kioskApprovalRejectionOutcome().message);
  }

  function showErrorResult(message: string) {
    setResult({ kind: "error", message });
    setPhase("result");
    scheduleAutoReturn(KIOSK_ERROR_AUTO_RETURN_MS, resetToSearch);
  }

  function showPolicyBlock(title: string, message: string) {
    setResult({ kind: "policy-blocked", title, message });
    setPhase("result");
  }

  async function handleIdentityConfirm() {
    if (!selectedVisit) {
      return;
    }

    if (canCheckOutVisit(selectedVisit.status)) {
      setPhase("confirm-checkout");
      return;
    }

    if (isVisitAwaitingCheckinApproval(selectedVisit.status)) {
      setApprovalVisit(selectedVisit);
      setPhase("approval-pending");
      return;
    }

    if (isVisitAwaitingPreVisitApproval(selectedVisit.status)) {
      setApprovalVisit(selectedVisit);
      setPhase("approval-wait");
      return;
    }

    if (!canKioskCheckInVisit(selectedVisit.status)) {
      showErrorResult(
        `Cannot check in this visit yet (status: ${selectedVisit.status}).`,
      );
      return;
    }

    try {
      await executeCheckIn(selectedVisit);
    } catch (error) {
      showErrorResult(
        error instanceof ApiError ? error.message : "Could not continue check-in.",
      );
    }
  }

  function handleCheckInPolicyError(outcome: {
    kind: "error";
    message: string;
    code?: string;
  }): boolean {
    if (isPolicyCaptureErrorCode(outcome.code)) {
      setCaptureError(outcome.message);
      setPhase("capture");
      return true;
    }

    if (outcome.code === "OUTSIDE_VISIT_HOURS") {
      showPolicyBlock("Check-in unavailable", outcome.message);
      return true;
    }

    if (outcome.code === "KIOSK_DISABLED") {
      showPolicyBlock("Kiosk unavailable", outcome.message);
      return true;
    }

    return false;
  }

  function validateCapture(): boolean {
    const result = validateKioskCapture({
      requirePhoto,
      requireDocuments,
      photoUrl,
      documents,
    });

    if (!result.valid) {
      setCaptureError(result.message);
      return false;
    }

    setCaptureError(null);
    return true;
  }

  function completeCheckInSuccess(
    visit: VisitWithRelations,
    badge?: ThermalBadgeData | null,
  ) {
    if (!isVisitCheckedIn(visit.status)) {
      showErrorResult("Check-in was not confirmed. Please see reception.");
      return;
    }

    const branchOperational = getForBranch(visit.branchId);
    const showBadgePrinting = branchOperational.badgePrintingEnabled;

    setApprovalVisit(null);
    setResult({
      kind: "success",
      action: "check-in",
      visit,
      badge,
      showBadgePrinting,
      photoUrl,
    });

    if (showBadgePrinting && badge) {
      setPhase("badge");
    } else {
      setPhase("result");
    }
  }

  async function handleApprovalResolved(visit: VisitWithRelations) {
    setExecuting(true);

    let activePhotoUrl = photoUrl;
    let activeDocuments = documents;

    if (!activePhotoUrl && activeDocuments.length === 0) {
      const media = await loadVisitMedia(visit.id);
      activePhotoUrl = media.photoUrl;
      activeDocuments = toKioskCapturedDocuments(media);
      setPhotoUrl(activePhotoUrl);
      setDocuments(activeDocuments);
    }

    const outcome = await completeKioskApprovalOutcome({
      visit,
      visitorId: visit.visitor.id,
      photoUrl: activePhotoUrl,
      documents: activeDocuments,
    });
    setExecuting(false);

    if (outcome.kind === "checked-in") {
      completeCheckInSuccess(outcome.visit, outcome.badge);
      return;
    }

    if (outcome.kind === "error") {
      if (!handleCheckInPolicyError(outcome)) {
        showErrorResult(outcome.message);
      }
      return;
    }
  }

  function handleApprovalRejected() {
    setApprovalVisit(null);
    setPhotoUrl(null);
    setDocuments([]);
    showErrorResult(kioskApprovalRejectionOutcome().message);
  }

  async function executeCheckIn(
    visitOverride?: VisitWithRelations,
    captureOverride?: {
      photoUrl?: string | null;
      documents?: KioskCapturedDocument[];
    },
  ) {
    const visit = visitOverride ?? selectedVisit;
    if (!visit || executing) {
      return;
    }

    const activePhotoUrl = captureOverride?.photoUrl ?? photoUrl;
    const activeDocuments = captureOverride?.documents ?? documents;

    setExecuting(true);

    const outcome = await runKioskCheckIn({
      visitId: visit.id,
      visitorId: visit.visitor.id,
      photoUrl: activePhotoUrl,
      documents: activeDocuments,
    });

    setExecuting(false);

    if (outcome.kind === "approval-required") {
      setSelectedVisit(outcome.visit);
      setApprovalVisit(outcome.visit);
      setPhase("approval-pending");
      return;
    }

    if (outcome.kind === "pending") {
      setSelectedVisit(outcome.visit);
      setApprovalVisit(outcome.visit);
      setPhase("approval-wait");
      return;
    }

    if (outcome.kind === "error") {
      if (!handleCheckInPolicyError(outcome)) {
        showErrorResult(outcome.message);
      }
      return;
    }

    if (activePhotoUrl) {
      setPhotoUrl(activePhotoUrl);
    }

    completeCheckInSuccess(outcome.visit, outcome.badge);
  }

  async function executeCheckOut() {
    if (!selectedVisit || executing) {
      return;
    }

    setExecuting(true);

    try {
      const checkout = await checkOutVisit(selectedVisit.id);
      setResult({
        kind: "success",
        action: "check-out",
        visit: checkout.visit,
      });
      setPhase("result");
    } catch (err) {
      showErrorResult(
        err instanceof ApiError ? err.message : "Check-out failed.",
      );
    } finally {
      setExecuting(false);
    }
  }

  function handleCaptureContinue() {
    if (!validateCapture()) {
      return;
    }
    void executeCheckIn();
  }

  const frameOnBack =
    phase === "result"
      ? resetToSearch
      : phase === "badge"
        ? advanceToResult
        : phase === "approval-pending" || phase === "approval-wait"
          ? resetToSearch
          : handleFrameBack;

  return (
    <KioskFlowFrame
      title="Find my booking"
      subtitle={phaseSubtitle(phase)}
      onBack={frameOnBack}
      wide
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col py-2",
          phase === "search" ? kioskFlowNarrow : kioskFlowWide,
          kioskPhaseEnter,
        )}
      >
        {phase === "result" && result?.kind === "policy-blocked" ? (
          <KioskResultScreen
            variant="policy-blocked"
            layout="contained"
            title={result.title}
            message={result.message}
            onHome={resetToSearch}
            onTryBooking={onTryBooking ?? resetToSearch}
          />
        ) : null}

        {phase === "badge" &&
        result?.kind === "success" &&
        result.action === "check-in" &&
        result.badge ? (
          <KioskBookingBadge
            visit={result.visit}
            badge={result.badge}
            photoUrl={result.photoUrl}
            onContinue={advanceToResult}
          />
        ) : null}

        {phase === "result" && result?.kind === "success" ? (
          result.action === "check-in" ? (
            <KioskResultScreen
              variant="check-in-success"
              layout="contained"
              visitorName={kioskVisitorName(result.visit)}
              hostName={kioskHostLabel(result.visit)}
              branchName={result.visit.branch.name}
              photoUrl={result.photoUrl}
              showBadgePrinting={false}
            />
          ) : (
            <KioskResultScreen
              variant="check-out-success"
              layout="contained"
              visitorName={kioskVisitorName(result.visit)}
            />
          )
        ) : null}

        {phase === "result" && result?.kind === "error" ? (
          <KioskResultScreen
            variant="error"
            layout="contained"
            message={result.message}
            onRetry={resetToSearch}
          />
        ) : null}

        {phase === "identity" && selectedVisit ? (
          <KioskVisitIdentityConfirm
            visit={selectedVisit}
            onConfirm={handleIdentityConfirm}
            onReject={() => {
              setSelectedVisit(null);
              setPhase("search");
            }}
            disabled={executing}
          />
        ) : null}

        {phase === "confirm-checkout" && selectedVisit ? (
          <KioskCheckoutConfirm
            visit={selectedVisit}
            onConfirm={() => void executeCheckOut()}
            onCancel={() => {
              setSelectedVisit(null);
              setPhase("search");
            }}
            disabled={executing}
          />
        ) : null}

        {phase === "approval-pending" && approvalVisit ? (
          <KioskApprovalPending
            visit={approvalVisit}
            onApproved={(visit) => void handleApprovalResolved(visit)}
            onRejected={handleApprovalRejected}
          />
        ) : null}

        {phase === "approval-wait" && approvalVisit ? (
          <KioskPendingApprovalScreen
            visit={approvalVisit}
            onApproved={handlePendingApproved}
            onRejected={handlePendingRejected}
            onCancel={resetToSearch}
          />
        ) : null}

        {phase === "capture" && selectedVisit ? (
          <KioskBookingCapture
            key={selectedVisit.id}
            visit={selectedVisit}
            photoUrl={photoUrl}
            onPhotoChange={(value) => {
              setPhotoUrl(value);
              if (value) {
                setCaptureError(null);
              }
            }}
            documents={documents}
            onDocumentsChange={(next) => {
              setDocuments(next);
              if (next.length > 0) {
                setCaptureError(null);
              }
            }}
            requirePhoto={requirePhoto}
            requireDocuments={requireDocuments}
            captureError={captureError}
            executing={executing}
            onContinue={handleCaptureContinue}
          />
        ) : null}

        {phase === "search" ? (
          <>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Search className="h-5 w-5 text-blue-600" strokeWidth={1.75} />
              </div>
              <h2 className={kioskCompactTitle}>Look up your visit</h2>
              <p className={cn("mt-1", kioskCompactSupporting)}>
                Enter the details from your invitation or booking confirmation
              </p>
            </div>

            <form onSubmit={handleSearch} className="mt-5 space-y-3">
              <Input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Full name, email, or phone number"
                className={kioskCompactInput}
                disabled={resolving}
                autoComplete="off"
                aria-label="Search for your booking"
              />
              <Button
                type="submit"
                size="lg"
                className={cn("w-full", kioskCompactButton)}
                disabled={resolving || !query.trim()}
              >
                {resolving ? "Searching…" : "Search bookings"}
              </Button>
            </form>

            {resolving ? (
              <div className="mt-3">
                <KioskResolvingHint />
              </div>
            ) : null}

            {searchError && !resolving ? (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
                {searchError}
              </p>
            ) : null}

            <div className="mt-5 min-h-[8rem] flex-1">
              {!hasSearched && !resolving ? (
                <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    Start by entering your details above
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">
                    Select a booking to verify your identity and check in
                  </p>
                </div>
              ) : null}

              {!resolving && visits.length > 0 ? (
                <KioskBookingResultsList
                  visits={visits}
                  onSelect={handleSelectVisit}
                />
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </KioskFlowFrame>
  );
}
