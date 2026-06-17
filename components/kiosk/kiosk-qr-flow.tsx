"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { KioskQrDebugPanel } from "@/components/kiosk/kiosk-qr-debug-panel";
import { KioskApprovalPending } from "@/components/kiosk/kiosk-approval-pending";
import { KioskPendingApprovalScreen } from "@/components/kiosk/kiosk-pending-approval-screen";
import { KioskScanHint } from "@/components/kiosk/kiosk-scan-hint";
import { KioskBookingBadge } from "@/components/kiosk/kiosk-booking-badge";
import { KioskBookingCapture } from "@/components/kiosk/kiosk-booking-capture";
import { KioskCheckoutConfirm } from "@/components/kiosk/kiosk-checkout-confirm";
import type { KioskCapturedDocument } from "@/components/kiosk/kiosk-document-upload";
import { KioskFlowFrame } from "@/components/kiosk/kiosk-flow-frame";
import {
  KioskQrCameraRecoverPanel,
  KioskQrRecoverPanel,
} from "@/components/kiosk/kiosk-qr-recover-panel";
import {
  KioskQrScanner,
  type QrScannerCameraStatus,
} from "@/components/kiosk/kiosk-qr-scanner";
import { KioskResultScreen } from "@/components/kiosk/kiosk-result-screen";
import { KioskVisitIdentityConfirm } from "@/components/kiosk/kiosk-visit-identity-confirm";
import {
  KIOSK_ERROR_AUTO_RETURN_MS,
  KIOSK_SUCCESS_DISMISS_MS,
  kioskFlowWide,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { ApiError } from "@/lib/api/client";
import { validateKioskCapture } from "@/lib/kiosk/capture-validation";
import { useKioskOperational } from "@/lib/kiosk/kiosk-operational-context";
import { cameraRecoverCopy } from "@/lib/kiosk/qr-scanner-recovery";
import { resolveQrWithRetry } from "@/lib/kiosk/resolve-qr-with-retry";
import {
  isQrDebugMode,
  type QrDecoderDebugState,
  type QrDecodeStability,
  type QrLightingHint,
} from "@/lib/kiosk/qr-decoder-engine";
import { appendKioskQrDebugEvent } from "@/lib/kiosk/kiosk-qr-debug-log";
import {
  type ScanHint,
  type ScanIgnoreReason,
  scanHintForIgnoreReason,
} from "@/lib/kiosk/scan-ignore";
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

const SCAN_DEBOUNCE_MS = 2_000;
const SCAN_RESET_STABILIZE_MS = 100;
const IGNORE_HINT_COOLDOWN_MS = 1_500;
const SCAN_HINT_DISMISS_MS = 4_000;

type ScanDebugState = "idle" | "detected" | "processing" | "ignored";

function truncateScanToken(token: string | null, max = 24) {
  if (!token) {
    return "—";
  }
  return token.length > max ? `${token.slice(0, max)}…` : token;
}

function KioskQrDebugStatusBanner({
  debugEnabled,
  panelMounted,
}: {
  debugEnabled: boolean;
  panelMounted: boolean;
}) {
  if (!isQrDebugMode()) {
    return null;
  }

  return (
    <div className="mb-2 rounded border border-amber-400 bg-amber-100 px-2 py-1 font-mono text-[11px] font-medium text-amber-950">
      DEBUG FLAG: {String(process.env.NEXT_PUBLIC_KIOSK_QR_DEBUG)} | Debug Enabled:{" "}
      {String(debugEnabled)} | Panel Mounted: {String(panelMounted)}
    </div>
  );
}

function KioskQrScanDebugStrip({
  phase,
  scanDebugState,
  scanDebugMessage,
  lastScanToken,
  lightingHint,
  decoderDiagnostics,
}: {
  phase: FlowPhase;
  scanDebugState: ScanDebugState;
  scanDebugMessage: string;
  lastScanToken: string | null;
  lightingHint: QrLightingHint;
  decoderDiagnostics: {
    stability: QrDecodeStability;
    confidence: number;
    recentTokens: string[];
    decodeVarianceIndex: number;
  } | null;
}) {
  if (!isQrDebugMode()) {
    return null;
  }

  return (
    <div
      className="pointer-events-none mb-2 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[10px] leading-snug text-[var(--muted)]"
      aria-live="polite"
    >
      <p>
        QR: {scanDebugState} | phase: {phase} | LIGHT: {lightingHint}
        {scanDebugMessage ? ` | ${scanDebugMessage}` : ""}
        {lastScanToken ? ` | token: ${truncateScanToken(lastScanToken)}` : ""}
      </p>
      {decoderDiagnostics ? (
        <p className="mt-0.5">
          Decode stability: {decoderDiagnostics.stability} | Confidence:{" "}
          {decoderDiagnostics.confidence.toFixed(2)} | Variance:{" "}
          {decoderDiagnostics.decodeVarianceIndex.toFixed(2)}
          {decoderDiagnostics.recentTokens.length > 0
            ? ` | Last tokens: ${decoderDiagnostics.recentTokens.join(", ")}`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

type FlowPhase =
  | "scan"
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

type ScanError = {
  title: string;
  message: string;
};

function phaseSubtitle(phase: FlowPhase) {
  switch (phase) {
    case "scan":
      return "Align your invitation QR code";
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
      return "Scan your QR code";
  }
}

export function KioskQrFlow({
  qrEnabled = true,
  onBack,
  onFindBooking,
  onRegister: _onRegister,
}: {
  qrEnabled?: boolean;
  onBack: () => void;
  onFindBooking?: () => void;
  onRegister?: () => void;
}) {
  const goFindBooking = onFindBooking ?? onBack;
  const { getForBranch } = useKioskOperational();

  const phaseRef = useRef<FlowPhase>("scan");
  const resolvingRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);
  const lastScanAtRef = useRef(0);
  const lastIgnoredScanRef = useRef(0);
  const dismissTimerRef = useRef<number | null>(null);
  const resetStabilizeTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<FlowPhase>("scan");
  const [scannerKey, setScannerKey] = useState(0);
  const [scannerReady, setScannerReady] = useState(true);
  const [cameraStatus, setCameraStatus] =
    useState<QrScannerCameraStatus>("loading");
  const [resolving, setResolving] = useState(false);
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const [scanHint, setScanHint] = useState<ScanHint | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitWithRelations | null>(
    null,
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KioskCapturedDocument[]>([]);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [approvalVisit, setApprovalVisit] = useState<VisitWithRelations | null>(
    null,
  );
  const [scanDebugState, setScanDebugState] = useState<ScanDebugState>("idle");
  const [scanDebugMessage, setScanDebugMessage] = useState("");
  const [lastScanToken, setLastScanToken] = useState<string | null>(null);
  const [lightingHint, setLightingHint] = useState<QrLightingHint>("UNCLEAR");
  const [decoderDiagnostics, setDecoderDiagnostics] = useState<{
    stability: QrDecodeStability;
    confidence: number;
    recentTokens: string[];
    decodeVarianceIndex: number;
  } | null>(null);

  const qrDebugEnabled = isQrDebugMode();

  const updateScanDebug = useCallback((state: ScanDebugState, message: string) => {
    if (!isQrDebugMode()) {
      return;
    }

    setScanDebugState(state);
    setScanDebugMessage(message);
  }, []);

  const ignoreScan = useCallback(
    (reason: ScanIgnoreReason) => {
      const now = Date.now();
      if (
        (reason === "SCAN_IGNORED_DEBOUNCE" ||
          reason === "SCAN_IGNORED_CONFIRMED") &&
        now - lastIgnoredScanRef.current < IGNORE_HINT_COOLDOWN_MS
      ) {
        return;
      }

      if (
        reason === "SCAN_IGNORED_DEBOUNCE" ||
        reason === "SCAN_IGNORED_CONFIRMED"
      ) {
        lastIgnoredScanRef.current = now;
      }

      setScanHint(scanHintForIgnoreReason(reason));
      updateScanDebug("ignored", reason);
    },
    [updateScanDebug],
  );

  useEffect(() => {
    if (!scanHint) {
      return;
    }

    const timer = window.setTimeout(() => {
      setScanHint(null);
    }, SCAN_HINT_DISMISS_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [scanHint]);

  phaseRef.current = phase;

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const clearResetStabilizeTimer = useCallback(() => {
    if (resetStabilizeTimerRef.current !== null) {
      window.clearTimeout(resetStabilizeTimerRef.current);
      resetStabilizeTimerRef.current = null;
    }
  }, []);

  const scheduleScannerRemount = useCallback(() => {
    clearResetStabilizeTimer();
    setScannerReady(false);
    setCameraStatus("loading");

    resetStabilizeTimerRef.current = window.setTimeout(() => {
      setScannerKey((value) => value + 1);
      setScannerReady(true);
      resetStabilizeTimerRef.current = null;
    }, SCAN_RESET_STABILIZE_MS);
  }, [clearResetStabilizeTimer]);

  const resetToScan = useCallback(() => {
    clearDismissTimer();
    resolvingRef.current = false;
    setResolving(false);
    setSelectedVisit(null);
    setPhotoUrl(null);
    setDocuments([]);
    setCaptureError(null);
    setExecuting(false);
    setResult(null);
    setApprovalVisit(null);
    setScanError(null);
    setScanHint(null);
    setPhase("scan");
    lastTokenRef.current = null;
    if (isQrDebugMode()) {
      setScanDebugState("idle");
      setScanDebugMessage("");
      setLastScanToken(null);
      setDecoderDiagnostics(null);
    }
    scheduleScannerRemount();
  }, [clearDismissTimer, scheduleScannerRemount]);

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

  const restartCamera = useCallback(() => {
    setScanError(null);
    scheduleScannerRemount();
  }, [scheduleScannerRemount]);

  useEffect(() => {
    return () => {
      clearDismissTimer();
      clearResetStabilizeTimer();
    };
  }, [clearDismissTimer, clearResetStabilizeTimer]);

  useEffect(() => {
    if (phase !== "scan") {
      setScannerReady(false);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "result" || result?.kind !== "success") {
      return;
    }

    scheduleAutoReturn(KIOSK_SUCCESS_DISMISS_MS, resetToScan);
    return () => clearDismissTimer();
  }, [phase, result, scheduleAutoReturn, resetToScan, clearDismissTimer]);

  const operational = selectedVisit
    ? getForBranch(selectedVisit.branchId)
    : null;
  const requirePhoto = operational?.requireVisitorPhoto ?? false;
  const requireDocuments = operational?.requireVisitorDocuments ?? false;

  const lastDecoderPanelLogAtRef = useRef(0);

  useEffect(() => {
    if (!qrDebugEnabled) {
      return;
    }

    appendKioskQrDebugEvent("KIOSK QR", "phase transition", { phase });
  }, [phase, qrDebugEnabled]);

  const handleDecoderInstrumentation = useCallback(
    (state: QrDecoderDebugState) => {
      if (!qrDebugEnabled) {
        return;
      }

      setLightingHint(state.lightingHint);
      setDecoderDiagnostics({
        stability: state.decodeStability,
        confidence: state.lastConfidence,
        recentTokens: state.recentTokenPreviews,
        decodeVarianceIndex: state.decodeVarianceIndex,
      });

      const now = Date.now();
      if (now - lastDecoderPanelLogAtRef.current < 2000) {
        return;
      }
      lastDecoderPanelLogAtRef.current = now;

      appendKioskQrDebugEvent("KIOSK QR", "decoder metrics", {
        brightnessLevel: state.brightnessLevel,
        contrastEstimate: state.contrastEstimate,
        frameSharpness: state.frameSharpness,
        glareDetected: state.glareDetected,
        lowLight: state.lowLight,
        lightingHint: state.lightingHint,
        decoderConfidence: state.lastConfidence,
        dominantTokenConfidence: state.dominantTokenConfidence,
        decodeVarianceIndex: state.decodeVarianceIndex,
        decodeStability: state.decodeStability,
        glareScore: state.glareScore,
        contrastScore: state.contrastScore,
        failedDecodeRatio: state.failedDecodeRatio,
        frameRejections: state.frameRejections,
        confirmationProgress: state.confirmationProgress,
        confirmMode: state.confirmMode,
      });
    },
    [qrDebugEnabled],
  );

  const handleResolveScan = useCallback(async (qrToken: string) => {
    appendKioskQrDebugEvent("KIOSK QR", "scan received", {
      token: truncateScanToken(qrToken),
      tokenLength: qrToken.length,
      phase: phaseRef.current,
      resolving: resolvingRef.current,
      lastToken: truncateScanToken(lastTokenRef.current),
    });

    if (phaseRef.current !== "scan") {
      appendKioskQrDebugEvent("KIOSK QR", "scan ignored", {
        reason: "phase-not-scan",
        phase: phaseRef.current,
      });
      ignoreScan("SCAN_IGNORED_PHASE");
      return;
    }

    if (resolvingRef.current) {
      appendKioskQrDebugEvent("KIOSK QR", "scan ignored", {
        reason: "resolving-lock",
      });
      ignoreScan("SCAN_IGNORED_RESOLVING");
      return;
    }

    const now = Date.now();
    if (
      qrToken === lastTokenRef.current &&
      now - lastScanAtRef.current < SCAN_DEBOUNCE_MS
    ) {
      appendKioskQrDebugEvent("KIOSK QR", "scan ignored", {
        reason: "duplicate-token-debounce",
        elapsedMs: now - lastScanAtRef.current,
        debounceMs: SCAN_DEBOUNCE_MS,
      });
      ignoreScan("SCAN_IGNORED_DEBOUNCE");
      return;
    }

    if (
      qrToken === lastTokenRef.current &&
      now - lastScanAtRef.current >= SCAN_DEBOUNCE_MS
    ) {
      appendKioskQrDebugEvent("KIOSK QR", "scan ignored", {
        reason: "duplicate-token-confirmed",
      });
      ignoreScan("SCAN_IGNORED_CONFIRMED");
      return;
    }

    if (isQrDebugMode()) {
      setLastScanToken(qrToken);
    }
    updateScanDebug("detected", "decoder confirmed token");

    lastTokenRef.current = qrToken;
    lastScanAtRef.current = now;
    resolvingRef.current = true;
    setResolving(true);
    setScanHint(null);
    updateScanDebug("processing", "resolving visit…");

    appendKioskQrDebugEvent("KIOSK QR", "resolving started", {
      token: truncateScanToken(qrToken),
    });

    try {
      const resolved = await resolveQrWithRetry(qrToken, {
        shouldAbort: () => phaseRef.current !== "scan",
        onAttemptStart: (attempt) => {
          appendKioskQrDebugEvent("KIOSK QR", "resolve attempt", {
            attempt: attempt + 1,
          });
        },
      });

      if (resolved.kind === "aborted") {
        appendKioskQrDebugEvent("KIOSK QR", "scan aborted", {
          reason: "phase-changed-during-resolve",
          phase: phaseRef.current,
        });
        updateScanDebug("ignored", "ignored: phase-changed-during-resolve");
        return;
      }

      if (resolved.kind === "failed") {
        appendKioskQrDebugEvent("KIOSK QR", "scan failed", {
          reason: resolved.timedOut ? "resolve-timeout" : "qr-resolve-failed",
          message: resolved.message,
        });
        setScanError({
          title: resolved.title,
          message: resolved.message,
        });
        updateScanDebug(
          "ignored",
          `ignored: ${resolved.timedOut ? "resolve-timeout" : "visit-not-found"} (${resolved.message})`,
        );
        return;
      }

      const visit = resolved.visit;
      appendKioskQrDebugEvent("KIOSK QR", "visit resolved", {
        visitId: visit.id,
        status: visit.status,
        qrExpiringSoon: resolved.qr.expiringSoon,
      });

      setPhotoUrl(null);
      setDocuments([]);
      setCaptureError(null);
      setScanError(null);
      setSelectedVisit(visit);

      if (isVisitAwaitingPreVisitApproval(visit.status)) {
        appendKioskQrDebugEvent("KIOSK QR", "phase transition", {
          nextPhase: "approval-wait",
        });
        setApprovalVisit(visit);
        setPhase("approval-wait");
        updateScanDebug("idle", "advanced to approval-wait");
        return;
      }

      appendKioskQrDebugEvent("KIOSK QR", "phase transition", {
        nextPhase: "identity",
      });
      setPhase("identity");
      updateScanDebug("idle", "advanced to identity");
    } finally {
      resolvingRef.current = false;
      setResolving(false);
    }
  }, [ignoreScan, updateScanDebug]);

  function handleFrameBack() {
    if (phase === "scan") {
      onBack();
      return;
    }
    if (phase === "badge") {
      advanceToResult();
      return;
    }
    if (phase === "approval-pending" || phase === "approval-wait") {
      resetToScan();
      return;
    }
    if (phase === "identity" || phase === "confirm-checkout") {
      setSelectedVisit(null);
      resetToScan();
      return;
    }
    if (phase === "capture") {
      setPhotoUrl(null);
      setDocuments([]);
      setCaptureError(null);
      setPhase("identity");
    }
  }

  function showErrorResult(message: string) {
    setResult({ kind: "error", message });
    setPhase("result");
    scheduleAutoReturn(KIOSK_ERROR_AUTO_RETURN_MS, resetToScan);
  }

  function showPolicyBlock(title: string, message: string) {
    setResult({ kind: "policy-blocked", title, message });
    setPhase("result");
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

  async function handleIdentityConfirm() {
    if (!selectedVisit) {
      return;
    }

    appendKioskQrDebugEvent("KIOSK QR", "identity confirm", {
      visitId: selectedVisit.id,
      status: selectedVisit.status,
    });

    if (canCheckOutVisit(selectedVisit.status)) {
      appendKioskQrDebugEvent("KIOSK QR", "phase transition", {
        nextPhase: "confirm-checkout",
      });
      setPhase("confirm-checkout");
      return;
    }

    if (isVisitAwaitingCheckinApproval(selectedVisit.status)) {
      appendKioskQrDebugEvent("KIOSK QR", "phase transition", {
        nextPhase: "approval-pending",
      });
      setApprovalVisit(selectedVisit);
      setPhase("approval-pending");
      return;
    }

    if (isVisitAwaitingPreVisitApproval(selectedVisit.status)) {
      appendKioskQrDebugEvent("KIOSK QR", "phase transition", {
        nextPhase: "approval-wait",
      });
      setApprovalVisit(selectedVisit);
      setPhase("approval-wait");
      return;
    }

    if (!canKioskCheckInVisit(selectedVisit.status)) {
      appendKioskQrDebugEvent("KIOSK QR", "identity confirm blocked", {
        reason: "status-not-check-in-eligible",
        status: selectedVisit.status,
      });
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
      appendKioskQrDebugEvent("KIOSK QR", "phase transition", {
        nextPhase: "capture",
        policyCode: outcome.code,
      });
      return true;
    }

    if (outcome.code === "OUTSIDE_VISIT_HOURS") {
      appendKioskQrDebugEvent("KIOSK QR", "check-in blocked", {
        reason: "outside-operating-hours",
      });
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
      if (!visit) {
        appendKioskQrDebugEvent("KIOSK QR", "check-in skipped", {
          reason: "no-visit",
        });
      } else if (executing) {
        appendKioskQrDebugEvent("KIOSK QR", "check-in skipped", {
          reason: "already-executing",
        });
      }
      return;
    }

    const activePhotoUrl = captureOverride?.photoUrl ?? photoUrl;
    const activeDocuments = captureOverride?.documents ?? documents;

    setExecuting(true);
    appendKioskQrDebugEvent("KIOSK QR", "runKioskCheckIn start", {
      visitId: visit.id,
    });

    const outcome = await runKioskCheckIn({
      visitId: visit.id,
      visitorId: visit.visitor.id,
      photoUrl: activePhotoUrl,
      documents: activeDocuments,
    });

    setExecuting(false);

    if (outcome.kind === "approval-required") {
      appendKioskQrDebugEvent("KIOSK QR", "check-in approval required", {
        visitId: outcome.visit.id,
        status: outcome.visit.status,
      });
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
      appendKioskQrDebugEvent("KIOSK QR", "check-in failed", {
        message: outcome.message,
        code: outcome.code,
      });
      if (!handleCheckInPolicyError(outcome)) {
        showErrorResult(outcome.message);
      }
      return;
    }

    if (activePhotoUrl) {
      setPhotoUrl(activePhotoUrl);
    }

    appendKioskQrDebugEvent("KIOSK QR", "check-in success", {
      visitId: outcome.visit.id,
      hasBadge: Boolean(outcome.badge),
    });

    completeCheckInSuccess(outcome.visit, outcome.badge);
  }

  async function executeCheckOut() {
    if (!selectedVisit || executing) {
      return;
    }

    setExecuting(true);
    appendKioskQrDebugEvent("KIOSK QR", "check-out start", {
      visitId: selectedVisit.id,
    });

    try {
      const checkout = await checkOutVisit(selectedVisit.id);
      appendKioskQrDebugEvent("KIOSK QR", "check-out success", {
        visitId: checkout.visit.id,
      });
      setResult({
        kind: "success",
        action: "check-out",
        visit: checkout.visit,
      });
      setPhase("result");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Check-out failed.";
      appendKioskQrDebugEvent("KIOSK QR", "check-out failed", { message });
      showErrorResult(message);
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

  function handleRetryScan() {
    setScanError(null);
    setScanHint(null);
    lastTokenRef.current = null;
    scheduleScannerRemount();
  }

  const frameOnBack =
    phase === "result"
      ? resetToScan
      : phase === "badge"
        ? advanceToResult
        : phase === "approval-pending" || phase === "approval-wait"
          ? resetToScan
          : handleFrameBack;

  const scannerActive =
    phase === "scan" &&
    scannerReady &&
    !scanError &&
    (cameraStatus === "loading" || cameraStatus === "ready");

  const cameraFailed =
    phase === "scan" &&
    !scanError &&
    cameraStatus !== "loading" &&
    cameraStatus !== "ready";

  if (!qrEnabled) {
    return (
      <KioskFlowFrame
        title="Scan QR code"
        subtitle="QR check-in unavailable"
        onBack={onBack}
        wide
      >
        {qrDebugEnabled ? (
          <KioskQrDebugStatusBanner
            debugEnabled={qrDebugEnabled}
            panelMounted={qrDebugEnabled}
          />
        ) : null}
        <KioskResultScreen
          variant="policy-blocked"
          layout="contained"
          title="QR check-in unavailable"
          message="QR scanning is not enabled at this location. Use find booking or see reception."
          onHome={onBack}
          onTryBooking={goFindBooking}
        />
        {qrDebugEnabled ? <KioskQrDebugPanel /> : null}
      </KioskFlowFrame>
    );
  }

  return (
    <KioskFlowFrame
      title="Scan QR code"
      subtitle={phaseSubtitle(phase)}
      onBack={frameOnBack}
      wide
    >
      {qrDebugEnabled ? (
        <KioskQrDebugStatusBanner
          debugEnabled={qrDebugEnabled}
          panelMounted={qrDebugEnabled}
        />
      ) : null}
      <div className={cn("mx-auto flex w-full flex-1 flex-col py-2", kioskFlowWide, kioskPhaseEnter)}>
        {phase === "result" && result?.kind === "policy-blocked" ? (
          <KioskResultScreen
            variant="policy-blocked"
            layout="contained"
            title={result.title}
            message={result.message}
            onHome={resetToScan}
            onTryBooking={goFindBooking}
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
            onRetry={resetToScan}
          />
        ) : null}

        {phase === "identity" && selectedVisit ? (
          <KioskVisitIdentityConfirm
            visit={selectedVisit}
            onConfirm={handleIdentityConfirm}
            onReject={resetToScan}
            disabled={executing}
          />
        ) : null}

        {phase === "confirm-checkout" && selectedVisit ? (
          <KioskCheckoutConfirm
            visit={selectedVisit}
            onConfirm={() => void executeCheckOut()}
            onCancel={resetToScan}
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
            onCancel={resetToScan}
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

        {phase === "scan" ? (
          <>
            {qrDebugEnabled ? (
              <KioskQrScanDebugStrip
                phase={phase}
                scanDebugState={scanDebugState}
                scanDebugMessage={scanDebugMessage}
                lastScanToken={lastScanToken}
                lightingHint={lightingHint}
                decoderDiagnostics={decoderDiagnostics}
              />
            ) : null}

            <KioskScanHint hint={scanHint} />

            {scanError ? (
              <KioskQrRecoverPanel
                title={scanError.title}
                message={scanError.message}
                primaryLabel="Retry scan"
                onPrimary={handleRetryScan}
                onFindBooking={goFindBooking}
                onHome={onBack}
              />
            ) : null}

            {cameraFailed ? (
              <KioskQrCameraRecoverPanel
                {...cameraRecoverCopy(cameraStatus)}
                onRetry={restartCamera}
                onFindBooking={goFindBooking}
                onHome={onBack}
              />
            ) : null}

            {!scanError && !cameraFailed && scannerReady ? (
              <KioskQrScanner
                active={scannerActive}
                scannerKey={scannerKey}
                resolving={resolving}
                onScan={(token) => void handleResolveScan(token)}
                onCameraStatus={setCameraStatus}
                onRestart={restartCamera}
                onDecoderInstrumentation={handleDecoderInstrumentation}
              />
            ) : null}

            {!scanError && !cameraFailed && !scannerReady ? (
              <div
                className={cn(
                  "flex aspect-[4/3] max-h-[28rem] w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--foreground)]",
                )}
                aria-live="polite"
              >
                <p className="text-sm text-[var(--card)]">Preparing scanner…</p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      {qrDebugEnabled ? <KioskQrDebugPanel /> : null}
    </KioskFlowFrame>
  );
}
