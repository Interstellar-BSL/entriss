"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { KioskApprovalPending } from "@/components/kiosk/kiosk-approval-pending";
import { KioskBookingBadge } from "@/components/kiosk/kiosk-booking-badge";
import { KioskRegisterCapture } from "@/components/kiosk/kiosk-capture-step";
import { KioskRegistrationReviewCard } from "@/components/kiosk/kiosk-confirm-card";
import { KioskFlowFrame } from "@/components/kiosk/kiosk-flow-frame";
import type { KioskCapturedDocument } from "@/components/kiosk/kiosk-document-upload";
import { KioskQrRecoverPanel } from "@/components/kiosk/kiosk-qr-recover-panel";
import {
  DEFAULT_REGISTER_PURPOSE,
  KioskRegisterForm,
  KioskRegisterFormActions,
  kioskRegisterFormSchema,
  type KioskRegisterFormValues,
} from "@/components/kiosk/kiosk-register-form";
import { KioskReturningVisitorSearch } from "@/components/kiosk/kiosk-returning-visitor-search";
import { KioskResultScreen } from "@/components/kiosk/kiosk-result-screen";
import {
  KIOSK_ERROR_AUTO_RETURN_MS,
  KIOSK_SUCCESS_DISMISS_MS,
  kioskFlowNarrow,
  kioskFlowWide,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { VisitorIdentityResolutionCard } from "@/components/visitors/visitor-identity-resolution";
import { ApiError } from "@/lib/api/client";
import {
  completeKioskApprovalOutcome,
  kioskApprovalRejectionOutcome,
} from "@/lib/kiosk/kiosk-check-in-workflow";
import {
  loadVisitMedia,
  persistKioskVisitMedia,
  toKioskCapturedDocuments,
} from "@/lib/kiosk/visit-media";
import { useKioskOperational } from "@/lib/kiosk/kiosk-operational-context";
import { isWithinVisitHours } from "@/lib/kiosk/operational-policy";
import { kioskHostLabel, kioskVisitorName } from "@/lib/kiosk/visit-display";
import type { HostSelection } from "@/lib/hosts/host-selection";
import {
  getHostSelectionLabel,
  isHostSelectionComplete,
  resolveHostForVisitSubmission,
} from "@/lib/hosts/host-selection";
import { loadBranchOptions } from "@/lib/visits/branches";
import {
  checkVisitorIdentityConflict,
  registerWalkInVisit,
  toWalkInVisitorInput,
  type PendingVisitorIdentityResolution,
  type VisitorIdentityDecision,
} from "@/lib/visits/visit-engine-client";
import { isVisitPendingApproval, isVisitCheckedIn } from "@/lib/visits/workflow-engine";
import type { VisitorRecord } from "@/lib/api/visitors";
import type { ThermalBadgeData } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { cn } from "@/lib/utils/cn";

type FlowPhase =
  | "details"
  | "identity-resolution"
  | "capture"
  | "review"
  | "approval-pending"
  | "badge"
  | "result";

type ResultPayload =
  | {
      kind: "success";
      visit: VisitWithRelations;
      badge?: ThermalBadgeData | null;
      showBadgePrinting: boolean;
      photoUrl?: string | null;
    }
  | {
      kind: "awaiting-approval";
      visitorName: string;
      photoUrl?: string | null;
      documents: KioskCapturedDocument[];
    }
  | { kind: "error"; message: string }
  | { kind: "policy-blocked"; title: string; message: string };

function phaseSubtitle(phase: FlowPhase) {
  switch (phase) {
    case "details":
      return "Enter your details";
    case "identity-resolution":
      return "Confirm your identity";
    case "capture":
      return "Photo and documents";
    case "review":
      return "Review and confirm";
    case "approval-pending":
      return "Awaiting approval";
    case "badge":
      return "Collect your badge";
    case "result":
      return "Registration complete";
    default:
      return "Register for today's visit";
  }
}

const setValueOptions = {
  shouldValidate: false,
  shouldDirty: true,
} as const;

export function KioskRegisterFlow({
  onBack,
  onTryBooking,
}: {
  onBack: () => void;
  onTryBooking?: () => void;
}) {
  const goFindBooking = onTryBooking ?? onBack;
  const firstNameRef = useRef<HTMLInputElement>(null);
  const dismissTimerRef = useRef<number | null>(null);
  const formValuesRef = useRef<KioskRegisterFormValues | null>(null);
  const { data: session } = useSession();
  const proxyHostMemberId = session?.user?.memberId ?? null;
  const { getForBranch, getTimezoneForBranch } = useKioskOperational();

  const [phase, setPhase] = useState<FlowPhase>("details");
  const [hostSelection, setHostSelection] = useState<HostSelection | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Awaited<ReturnType<typeof loadBranchOptions>>>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [identityResolving, setIdentityResolving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);

  const [identityDecision, setIdentityDecision] =
    useState<VisitorIdentityDecision | null>(null);
  const [pendingResolution, setPendingResolution] =
    useState<PendingVisitorIdentityResolution | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KioskCapturedDocument[]>([]);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [approvalVisit, setApprovalVisit] = useState<VisitWithRelations | null>(
    null,
  );
  const [registeredVisitorId, setRegisteredVisitorId] = useState<string | null>(
    null,
  );
  const [returningVisitor, setReturningVisitor] = useState<VisitorRecord | null>(
    null,
  );
  const [matchedVisitor, setMatchedVisitor] = useState<VisitorRecord | null>(null);

  const {
    register,
    trigger,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<KioskRegisterFormValues>({
    resolver: zodResolver(kioskRegisterFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      notes: "",
      hostMemberId: "",
      branchId: "",
      purpose: DEFAULT_REGISTER_PURPOSE,
    },
  });

  const [hostMemberId, branchId, purpose] = useWatch({
    control,
    name: ["hostMemberId", "branchId", "purpose"],
  }) as [string | undefined, string | undefined, string | undefined];

  const hostLabel = getHostSelectionLabel(hostSelection);

  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const branchOperational = getForBranch(branchId);
  const requirePhoto = branchOperational.requireVisitorPhoto;
  const requireDocuments = branchOperational.requireVisitorDocuments;

  const detailsReady =
    isHostSelectionComplete(hostSelection) &&
    Boolean(branchId) &&
    (purpose?.trim().length ?? 0) > 0;

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const resetFlow = useCallback(() => {
    clearDismissTimer();
    setPhase("details");
    setHostSelection(null);
    setHostError(null);
    setIdentityDecision(null);
    setPendingResolution(null);
    setPhotoUrl(null);
    setDocuments([]);
    setCaptureError(null);
    setRecoverError(null);
    setExecuting(false);
    setIdentityResolving(false);
    setResult(null);
    setApprovalVisit(null);
    setRegisteredVisitorId(null);
    formValuesRef.current = null;
    reset({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      notes: "",
      hostMemberId: "",
      branchId: branches.length === 1 ? (branches[0]?.id ?? "") : "",
      purpose: DEFAULT_REGISTER_PURPOSE,
    });
  }, [branches, clearDismissTimer, reset]);

  const scheduleAutoReturn = useCallback(
    (delayMs: number, action: () => void) => {
      clearDismissTimer();
      dismissTimerRef.current = window.setTimeout(action, delayMs);
    },
    [clearDismissTimer],
  );

  const advanceToResult = useCallback(() => {
    setPhase("result");
  }, []);

  useEffect(() => {
    if (!isHostSelectionComplete(hostSelection) || !proxyHostMemberId) {
      setValue("hostMemberId", "", setValueOptions);
      return;
    }

    try {
      const resolved = resolveHostForVisitSubmission({
        selection: hostSelection,
        proxyHostMemberId,
      });
      setValue("hostMemberId", resolved.hostMemberId, setValueOptions);
    } catch {
      setValue("hostMemberId", "", setValueOptions);
    }
  }, [hostSelection, proxyHostMemberId, setValue]);

  useEffect(() => {
    if (phase === "details") {
      window.setTimeout(() => firstNameRef.current?.focus(), 100);
    }
  }, [phase]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const options = await loadBranchOptions();
        if (!cancelled) {
          setBranches(options);
          if (options.length === 1) {
            setValue("branchId", options[0]!.id, setValueOptions);
          }
        }
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [setValue]);

  useEffect(() => {
    return () => clearDismissTimer();
  }, [clearDismissTimer]);

  useEffect(() => {
    if (phase !== "result" || result?.kind !== "success") {
      return;
    }

    scheduleAutoReturn(KIOSK_SUCCESS_DISMISS_MS, resetFlow);
    return () => clearDismissTimer();
  }, [phase, result, scheduleAutoReturn, resetFlow, clearDismissTimer]);

  function handleBranchSelect(id: string) {
    setValue("branchId", id, setValueOptions);
  }

  function handlePurposeSelect(value: string) {
    setValue("purpose", value, setValueOptions);
  }

  function showPolicyBlock(title: string, message: string) {
    setResult({ kind: "policy-blocked", title, message });
    setPhase("result");
  }

  function showErrorResult(message: string) {
    setResult({ kind: "error", message });
    setPhase("result");
    scheduleAutoReturn(KIOSK_ERROR_AUTO_RETURN_MS, resetFlow);
  }

  function handleReturningVisitorCandidate(visitor: VisitorRecord | null) {
    if (!visitor) {
      setMatchedVisitor(null);
      setReturningVisitor(null);
      setIdentityDecision(null);
      setValue("firstName", "", setValueOptions);
      setValue("lastName", "", setValueOptions);
      setValue("email", "", setValueOptions);
      setValue("phone", "", setValueOptions);
      setValue("company", "", setValueOptions);
      return;
    }

    setMatchedVisitor(visitor);
  }

  function handleConfirmReturningVisitor() {
    if (!matchedVisitor) {
      return;
    }

    setReturningVisitor(matchedVisitor);
    setValue("firstName", matchedVisitor.firstName, setValueOptions);
    setValue("lastName", matchedVisitor.lastName, setValueOptions);
    setValue("email", matchedVisitor.email ?? "", setValueOptions);
    setValue("phone", matchedVisitor.phone ?? "", setValueOptions);
    setValue("company", matchedVisitor.company ?? "", setValueOptions);
    setIdentityDecision({
      type: "use-existing",
      visitorId: matchedVisitor.id,
    });
    setPendingResolution(null);
  }

  function handleClearReturningMatch() {
    setMatchedVisitor(null);
    setReturningVisitor(null);
    setIdentityDecision(null);
  }

  async function handleDetailsContinue() {
    setRecoverError(null);
    setHostError(null);
    const valid = await trigger();
    if (!valid) {
      return;
    }

    if (!isHostSelectionComplete(hostSelection)) {
      setHostError("Select who you are visiting.");
      return;
    }

    if (!proxyHostMemberId) {
      setRecoverError("Kiosk session is not configured. Please see reception.");
      return;
    }

    const values = getValues();
    if (!values.branchId) {
      setRecoverError("No branch is available for registration.");
      return;
    }

    const operational = getForBranch(values.branchId);
    const branchTimezone = getTimezoneForBranch(values.branchId);
    if (!isWithinVisitHours(operational, new Date(), branchTimezone)) {
      showPolicyBlock("Check-in unavailable", "Outside operating hours");
      return;
    }

    formValuesRef.current = values;
    setIdentityResolving(true);

    try {
      if (identityDecision?.type === "use-existing") {
        setPhase("capture");
        return;
      }

      const conflict = await checkVisitorIdentityConflict({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        company: values.company,
      });

      if (conflict) {
        setPendingResolution(conflict);
        setIdentityDecision(null);
        setPhase("identity-resolution");
        return;
      }

      setIdentityDecision({ type: "no-conflict" });
      setPhase("capture");
    } catch (error) {
      setRecoverError(
        error instanceof ApiError
          ? error.message
          : "Identity check failed. Please try again.",
      );
    } finally {
      setIdentityResolving(false);
    }
  }

  function handleIdentityUseExisting() {
    if (!pendingResolution) {
      return;
    }

    setIdentityDecision({
      type: "use-existing",
      visitorId: pendingResolution.existingVisitor.id,
    });
    setPendingResolution(null);
    setPhase("capture");
  }

  function handleIdentityCreateSeparate() {
    setIdentityDecision({ type: "create-separate" });
    setPendingResolution(null);
    setPhase("capture");
  }

  function handleIdentityCancel() {
    setPendingResolution(null);
    setIdentityDecision(null);
    setPhase("details");
  }

  function validateCapture(): boolean {
    if (requirePhoto && !photoUrl) {
      setCaptureError("A visitor photo is required before continuing.");
      return false;
    }
    if (requireDocuments && documents.length === 0) {
      setCaptureError("At least one identification document is required.");
      return false;
    }
    setCaptureError(null);
    return true;
  }

  function handleCaptureContinue() {
    if (!validateCapture()) {
      return;
    }
    setPhase("review");
  }

  function completeCheckInSuccess(
    visit: VisitWithRelations,
    badge?: ThermalBadgeData | null,
  ) {
    if (!isVisitCheckedIn(visit.status)) {
      setRecoverError("Check-in was not confirmed. Please see reception.");
      setPhase("review");
      return;
    }

    const operational = getForBranch(visit.branchId);
    const showBadgePrinting = operational.badgePrintingEnabled;

    setApprovalVisit(null);
    setResult({
      kind: "success",
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

  async function completeRegistrationCheckIn(visit: VisitWithRelations) {
    let activePhotoUrl = photoUrl;
    let activeDocuments = documents;

    if (!activePhotoUrl && activeDocuments.length === 0) {
      const media = await loadVisitMedia(visit.id);
      activePhotoUrl = media.photoUrl;
      activeDocuments = toKioskCapturedDocuments(media);
    }

    const outcome = await completeKioskApprovalOutcome({
      visit,
      visitorId: registeredVisitorId ?? visit.visitor.id,
      photoUrl: activePhotoUrl,
      documents: activeDocuments,
    });

    if (outcome.kind === "approval-required") {
      setApprovalVisit(outcome.visit);
      setPhase("approval-pending");
      return;
    }

    if (outcome.kind === "pending") {
      setRecoverError("This visit is pending approval. Please see reception.");
      setPhase("review");
      return;
    }

    if (outcome.kind === "error") {
      setRecoverError(outcome.message);
      setPhase("review");
      return;
    }

    completeCheckInSuccess(outcome.visit, outcome.badge);
  }

  async function executeRegistration() {
    const values = formValuesRef.current ?? getValues();
    const decision = identityDecision;

    if (!decision) {
      setRecoverError("Identity must be confirmed before registering.");
      setPhase("details");
      return;
    }

    if (
      !isHostSelectionComplete(hostSelection) ||
      !proxyHostMemberId ||
      !values.branchId
    ) {
      setRecoverError("Registration details are incomplete.");
      return;
    }

    const operational = getForBranch(values.branchId);
    const branchTimezone = getTimezoneForBranch(values.branchId);
    if (!isWithinVisitHours(operational, new Date(), branchTimezone)) {
      showPolicyBlock("Check-in unavailable", "Outside operating hours");
      return;
    }

    if (!validateCapture()) {
      setPhase("capture");
      return;
    }

    setExecuting(true);
    setRecoverError(null);

    try {
      const resolvedHost = resolveHostForVisitSubmission({
        selection: hostSelection!,
        proxyHostMemberId: proxyHostMemberId!,
        purpose: values.purpose.trim(),
        visitorNotes: values.notes,
      });

      const registration = await registerWalkInVisit({
        visitor: {
          ...toWalkInVisitorInput(values),
          notes: resolvedHost.visitorNotes ?? values.notes,
          ...(photoUrl ? { photoUrl } : {}),
        },
        visit: {
          branchId: values.branchId,
          hostMemberId: resolvedHost.hostMemberId,
          purpose: resolvedHost.purpose ?? values.purpose.trim(),
        },
        decision,
      });

      setRegisteredVisitorId(registration.visitor.id);

      const persistResult = await persistKioskVisitMedia(registration.visit.id, {
        photoUrl,
        documents,
      });

      if (isVisitPendingApproval(registration.visit.status)) {
        setApprovalVisit(persistResult?.visit ?? registration.visit);
        setPhase("approval-pending");
        return;
      }

      if (persistResult?.state === "CHECKED_IN") {
        completeCheckInSuccess(persistResult.visit, persistResult.badge);
        return;
      }

      await completeRegistrationCheckIn(registration.visit);
    } catch (error) {
      setRecoverError(
        error instanceof ApiError
          ? error.message
          : "Registration failed. Please try again.",
      );
      setPhase("review");
    } finally {
      setExecuting(false);
    }
  }

  function handleFrameBack() {
    if (phase === "details") {
      onBack();
      return;
    }
    if (phase === "badge") {
      advanceToResult();
      return;
    }
    if (phase === "approval-pending") {
      resetFlow();
      return;
    }
    if (phase === "identity-resolution") {
      handleIdentityCancel();
      return;
    }
    if (phase === "capture") {
      setPhotoUrl(null);
      setDocuments([]);
      setCaptureError(null);
      setIdentityDecision(null);
      setPendingResolution(null);
      setPhase("details");
      return;
    }
    if (phase === "review") {
      setPhase("capture");
    }
  }

  const frameOnBack =
    phase === "result"
      ? resetFlow
      : phase === "badge"
        ? advanceToResult
        : phase === "approval-pending"
          ? resetFlow
          : handleFrameBack;

  const reviewValues = formValuesRef.current ?? getValues();
  const reviewDisplayName =
    `${reviewValues.firstName} ${reviewValues.lastName}`.trim();
  const reviewMetaLine = [
    reviewValues.company,
    hostLabel,
    selectedBranch?.name ?? "—",
  ]
    .filter(Boolean)
    .join(" · ");
  const reviewContactLine = [reviewValues.email, reviewValues.phone]
    .filter(Boolean)
    .join(" · ");

  return (
    <KioskFlowFrame
      title="New visitor"
      subtitle={phaseSubtitle(phase)}
      onBack={frameOnBack}
      wide
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col py-2",
          phase === "details" || phase === "identity-resolution"
            ? kioskFlowNarrow
            : kioskFlowWide,
          kioskPhaseEnter,
        )}
      >
        {phase === "result" && result?.kind === "policy-blocked" ? (
          <KioskResultScreen
            variant="policy-blocked"
            layout="contained"
            title={result.title}
            message={result.message}
            onHome={resetFlow}
            onTryBooking={goFindBooking}
          />
        ) : null}

        {phase === "badge" &&
        result?.kind === "success" &&
        result.badge ? (
          <KioskBookingBadge
            visit={result.visit}
            badge={result.badge}
            photoUrl={result.photoUrl}
            onContinue={advanceToResult}
          />
        ) : null}

        {phase === "result" && result?.kind === "success" ? (
          <KioskResultScreen
            variant="check-in-success"
            layout="contained"
            visitorName={kioskVisitorName(result.visit)}
            hostName={kioskHostLabel(result.visit)}
            branchName={result.visit.branch.name}
            photoUrl={result.photoUrl}
            showBadgePrinting={false}
          />
        ) : null}

        {phase === "result" && result?.kind === "awaiting-approval" ? (
          <KioskResultScreen
            variant="awaiting-approval"
            visitorName={result.visitorName}
            photoUrl={result.photoUrl}
            documents={result.documents}
            onDone={onBack}
          />
        ) : null}

        {phase === "result" && result?.kind === "error" ? (
          <KioskResultScreen
            variant="error"
            layout="contained"
            message={result.message}
            onRetry={resetFlow}
          />
        ) : null}

        {recoverError &&
        (phase === "details" || phase === "review") ? (
          <div className="mb-4">
            <KioskQrRecoverPanel
              title="Could not continue"
              message={recoverError}
              primaryLabel="Try again"
              onPrimary={() => setRecoverError(null)}
              onFindBooking={goFindBooking}
              onHome={onBack}
            />
          </div>
        ) : null}

        {phase === "details" ? (
          <>
            <KioskReturningVisitorSearch
              selected={returningVisitor}
              matchedVisitor={matchedVisitor}
              onCandidateSelect={handleReturningVisitorCandidate}
              onConfirmUse={handleConfirmReturningVisitor}
              onClearMatch={handleClearReturningMatch}
              disabled={isSubmitting || identityResolving}
            />
            <KioskRegisterForm
              register={register}
              errors={errors}
              branchId={branchId ?? ""}
              purpose={purpose ?? ""}
              branches={branches}
              optionsLoading={optionsLoading}
              selectedBranch={selectedBranch}
              disabled={isSubmitting || identityResolving}
              onBranchSelect={handleBranchSelect}
              onPurposeSelect={handlePurposeSelect}
              firstNameRef={firstNameRef}
              hostSelection={hostSelection}
              onHostSelectionChange={(selection) => {
                setHostSelection(selection);
                setHostError(null);
              }}
              hostError={hostError ?? undefined}
            />
            <div className="mt-6">
              <KioskRegisterFormActions
                onBack={onBack}
                onContinue={() => void handleDetailsContinue()}
                backLabel="Cancel"
                continueDisabled={!detailsReady}
                continueLoading={identityResolving}
              />
            </div>
          </>
        ) : null}

        {phase === "identity-resolution" && pendingResolution ? (
          <VisitorIdentityResolutionCard
            existingVisitor={pendingResolution.existingVisitor}
            visitStats={pendingResolution.visitStats}
            onUseExisting={handleIdentityUseExisting}
            onCreateSeparate={handleIdentityCreateSeparate}
            onCancel={handleIdentityCancel}
            isSubmitting={identityResolving}
          />
        ) : null}

        {phase === "approval-pending" && approvalVisit ? (
          <KioskApprovalPending
            visit={approvalVisit}
            onApproved={(visit) => void completeRegistrationCheckIn(visit)}
            onRejected={() => {
              setApprovalVisit(null);
              setResult({
                kind: "error",
                message: kioskApprovalRejectionOutcome().message,
              });
              setPhase("result");
            }}
          />
        ) : null}

        {phase === "capture" ? (
          <KioskRegisterCapture
            values={formValuesRef.current ?? getValues()}
            hostLabel={hostLabel}
            selectedBranch={selectedBranch}
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
            cameraActive
            onContinue={handleCaptureContinue}
            onBack={handleFrameBack}
          />
        ) : null}

        {phase === "review" ? (
          <section aria-label="Review and confirm" className="space-y-4">
            {recoverError ? (
              <KioskQrRecoverPanel
                title="Registration could not be completed"
                message={recoverError}
                primaryLabel="Try again"
                onPrimary={() => {
                  setRecoverError(null);
                  void executeRegistration();
                }}
                onFindBooking={goFindBooking}
                onHome={onBack}
              />
            ) : (
              <KioskRegistrationReviewCard
                displayName={reviewDisplayName}
                metaLine={reviewMetaLine}
                contactLine={reviewContactLine}
                purpose={reviewValues.purpose}
                documentCount={documents.length}
                photoUrl={photoUrl}
                executing={executing}
                onSubmit={() => void executeRegistration()}
                onBack={() => setPhase("capture")}
              />
            )}
          </section>
        ) : null}
      </div>
    </KioskFlowFrame>
  );
}
