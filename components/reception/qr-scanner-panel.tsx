"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { KioskApprovalPending } from "@/components/kiosk/kiosk-approval-pending";
import { KioskDocumentCapture } from "@/components/kiosk/kiosk-document-upload";
import type { KioskCapturedDocument } from "@/components/kiosk/kiosk-document-upload";
import { KioskPendingApprovalScreen } from "@/components/kiosk/kiosk-pending-approval-screen";
import { KioskPhotoCapture } from "@/components/kiosk/kiosk-photo-capture";
import {
  KioskQrCameraRecoverPanel,
  KioskQrRecoverPanel,
} from "@/components/kiosk/kiosk-qr-recover-panel";
import {
  KioskQrScanner,
  type QrScannerCameraStatus,
} from "@/components/kiosk/kiosk-qr-scanner";
import { KioskScanHint } from "@/components/kiosk/kiosk-scan-hint";
import { BadgePreviewModal } from "@/components/visits/badge-preview-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KIOSK_ERROR_AUTO_RETURN_MS } from "@/components/kiosk/kiosk-ui";
import { ApiError } from "@/lib/api/client";
import { isKioskCaptureReady, validateKioskCapture } from "@/lib/kiosk/capture-validation";
import {
  completeKioskApprovalOutcome,
  isPolicyCaptureErrorCode,
  kioskApprovalRejectionOutcome,
  runKioskCheckIn,
} from "@/lib/kiosk/kiosk-check-in-workflow";
import {
  fetchKioskOperationalSnapshot,
  getOperationalForBranch,
  type KioskOperationalSnapshot,
} from "@/lib/kiosk/operational-policy";
import { cameraRecoverCopy } from "@/lib/kiosk/qr-scanner-recovery";
import { resolveQrWithRetry } from "@/lib/kiosk/resolve-qr-with-retry";
import {
  type ScanHint,
  type ScanIgnoreReason,
  scanHintForIgnoreReason,
} from "@/lib/kiosk/scan-ignore";
import { checkOutVisit } from "@/lib/visits/visit-engine-client";
import {
  canCheckOutVisit,
  canKioskCheckInVisit,
  isVisitAwaitingPreVisitApproval,
} from "@/lib/visits/actions";
import type { ThermalBadgeData } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { cn } from "@/lib/utils/cn";

const RESUME_DELAY_MS = 2500;
const IGNORE_HINT_COOLDOWN_MS = 1_500;
const SCAN_HINT_DISMISS_MS = 4_000;
const SCAN_RESET_STABILIZE_MS = 100;
const OPERATIONAL_WARNING_DISMISS_MS = 8_000;

type FlowPhase =
  | "scan"
  | "capture-required"
  | "approval-wait"
  | "approval-pending";

type OverlayState = "idle" | "success" | "processing";

interface ScanFeedback {
  visitorName: string;
  statusLabel: string;
}

interface ScanError {
  title: string;
  message: string;
}

interface PendingCapture {
  visit: VisitWithRelations;
  requirePhoto: boolean;
  requireDocuments: boolean;
}

type ReceptionQrScanResult =
  | {
      kind: "check-out";
      visit: VisitWithRelations;
      badge: null;
    }
  | {
      kind: "check-in";
      visit: VisitWithRelations;
      badge: ThermalBadgeData | null;
    }
  | {
      kind: "capture-required";
      visit: VisitWithRelations;
      requirePhoto: boolean;
      requireDocuments: boolean;
    }
  | {
      kind: "approval-wait";
      visit: VisitWithRelations;
    }
  | {
      kind: "approval-pending";
      visit: VisitWithRelations;
    };

function visitorDisplayName(visit: VisitWithRelations) {
  return `${visit.visitor.firstName} ${visit.visitor.lastName}`;
}

function ScannerFrame({
  embedded,
  title,
  subtitle,
  children,
  contentClassName,
}: {
  embedded?: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  if (embedded) {
    return <div className={cn("space-y-3", contentClassName)}>{children}</div>;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? (
          <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className={cn("space-y-3", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

async function processReceptionVisit(
  visit: VisitWithRelations,
  operationalSnapshot: KioskOperationalSnapshot,
): Promise<ReceptionQrScanResult> {
  if (canCheckOutVisit(visit.status)) {
    const checkout = await checkOutVisit(visit.id);
    return {
      kind: "check-out",
      visit: checkout.visit,
      badge: null,
    };
  }

  if (isVisitAwaitingPreVisitApproval(visit.status)) {
    return {
      kind: "approval-wait",
      visit,
    };
  }

  if (!canKioskCheckInVisit(visit.status)) {
    throw new Error(`Cannot check in visit (status: ${visit.status}).`);
  }

  const operational = getOperationalForBranch(operationalSnapshot, visit.branchId);

  const outcome = await runKioskCheckIn({
    visitId: visit.id,
    visitorId: visit.visitor.id,
    source: "reception",
  });

  if (outcome.kind === "approval-required") {
    return {
      kind: "approval-pending",
      visit: outcome.visit,
    };
  }

  if (outcome.kind === "pending") {
    return {
      kind: "approval-wait",
      visit: outcome.visit,
    };
  }

  if (outcome.kind === "error") {
    if (isPolicyCaptureErrorCode(outcome.code)) {
      return {
        kind: "capture-required",
        visit,
        requirePhoto: operational.requireVisitorPhoto,
        requireDocuments: operational.requireVisitorDocuments,
      };
    }

    throw new Error(outcome.message);
  }

  return {
    kind: "check-in",
    visit: outcome.visit,
    badge: outcome.badge ?? null,
  };
}

function applyScanSuccess(
  result: Extract<ReceptionQrScanResult, { kind: "check-in" | "check-out" }>,
  setOverlay: (state: OverlayState) => void,
  setFeedback: (feedback: ScanFeedback) => void,
  setBadgeVisit: (visit: VisitWithRelations) => void,
  setBadgeInitial: (badge: ThermalBadgeData | null) => void,
  setBadgeModalOpen: (open: boolean) => void,
) {
  setOverlay("success");
  setFeedback({
    visitorName: visitorDisplayName(result.visit),
    statusLabel: result.kind === "check-out" ? "Checked out" : "Checked in",
  });

  if (result.kind === "check-in" && result.badge) {
    setBadgeVisit(result.visit);
    setBadgeInitial(result.badge);
    setBadgeModalOpen(true);
  }
}

export function QrScannerPanel({
  embedded = false,
  onManualLookup,
  onClose,
}: {
  embedded?: boolean;
  onManualLookup?: () => void;
  onClose?: () => void;
}) {
  const resolvingRef = useRef(false);
  const flowPhaseRef = useRef<FlowPhase>("scan");
  const lastIgnoredScanRef = useRef(0);
  const resumeTimerRef = useRef<number | null>(null);
  const resetStabilizeTimerRef = useRef<number | null>(null);
  const operationalSnapshotRef = useRef<KioskOperationalSnapshot | null>(null);
  const operationalWarningShownRef = useRef(false);
  const rejectionTimerRef = useRef<number | null>(null);

  const [flowPhase, setFlowPhase] = useState<FlowPhase>("scan");
  const [overlay, setOverlay] = useState<OverlayState>("idle");
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const [scanHint, setScanHint] = useState<ScanHint | null>(null);
  const [scannerKey, setScannerKey] = useState(0);
  const [scannerReady, setScannerReady] = useState(true);
  const [cameraStatus, setCameraStatus] =
    useState<QrScannerCameraStatus>("loading");
  const [resolving, setResolving] = useState(false);
  const [operationalLoadWarning, setOperationalLoadWarning] = useState(false);

  const [approvalVisit, setApprovalVisit] = useState<VisitWithRelations | null>(
    null,
  );
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KioskCapturedDocument[]>([]);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureExecuting, setCaptureExecuting] = useState(false);
  const [approvalExecuting, setApprovalExecuting] = useState(false);

  const [badgeVisit, setBadgeVisit] = useState<VisitWithRelations | null>(null);
  const [badgeInitial, setBadgeInitial] = useState<ThermalBadgeData | null>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);

  const requirePhoto = pendingCapture?.requirePhoto ?? false;
  const requireDocuments = pendingCapture?.requireDocuments ?? false;
  const captureReady = isKioskCaptureReady({
    requirePhoto,
    requireDocuments,
    photoUrl,
    documents,
  });

  flowPhaseRef.current = flowPhase;

  const ignoreScan = useCallback((reason: ScanIgnoreReason) => {
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
  }, []);

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

  useEffect(() => {
    if (!operationalLoadWarning) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOperationalLoadWarning(false);
    }, OPERATIONAL_WARNING_DISMISS_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [operationalLoadWarning]);

  useEffect(() => {
    let cancelled = false;

    void fetchKioskOperationalSnapshot()
      .then((snapshot) => {
        if (!cancelled) {
          operationalSnapshotRef.current = snapshot;
        }
      })
      .catch(() => {
        if (!cancelled && !operationalWarningShownRef.current) {
          operationalWarningShownRef.current = true;
          setOperationalLoadWarning(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const clearResetStabilizeTimer = useCallback(() => {
    if (resetStabilizeTimerRef.current !== null) {
      window.clearTimeout(resetStabilizeTimerRef.current);
      resetStabilizeTimerRef.current = null;
    }
  }, []);

  const clearRejectionTimer = useCallback(() => {
    if (rejectionTimerRef.current !== null) {
      window.clearTimeout(rejectionTimerRef.current);
      rejectionTimerRef.current = null;
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

  const resetCaptureState = useCallback(() => {
    setPendingCapture(null);
    setPhotoUrl(null);
    setDocuments([]);
    setCaptureError(null);
    setCaptureExecuting(false);
  }, []);

  const returnToScan = useCallback(() => {
    clearResumeTimer();
    clearRejectionTimer();
    resetCaptureState();
    setApprovalVisit(null);
    setApprovalExecuting(false);
    setFlowPhase("scan");
    resolvingRef.current = false;
    setResolving(false);
    setOverlay("idle");
    setFeedback(null);
    setScanError(null);
    setScanHint(null);
    scheduleScannerRemount();
  }, [
    clearRejectionTimer,
    clearResumeTimer,
    resetCaptureState,
    scheduleScannerRemount,
  ]);

  const dismissScanner = useCallback(() => {
    if (embedded && onClose) {
      onClose();
      return;
    }

    returnToScan();
  }, [embedded, onClose, returnToScan]);

  const resumeScanning = useCallback(() => {
    resolvingRef.current = false;
    setResolving(false);
    setOverlay("idle");
    setFeedback(null);
    setScanError(null);
  }, []);

  const scheduleResume = useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = window.setTimeout(() => {
      resumeScanning();
    }, RESUME_DELAY_MS);
  }, [clearResumeTimer, resumeScanning]);

  const restartCamera = useCallback(() => {
    setScanError(null);
    scheduleScannerRemount();
  }, [scheduleScannerRemount]);

  const handleRetryScan = useCallback(() => {
    setScanError(null);
    setScanHint(null);
    resolvingRef.current = false;
    setResolving(false);
    scheduleScannerRemount();
  }, [scheduleScannerRemount]);

  const handleCaptureCancel = useCallback(() => {
    dismissScanner();
  }, [dismissScanner]);

  const routeCheckInOutcome = useCallback(
    async (
      outcome: Awaited<ReturnType<typeof runKioskCheckIn>>,
      visitFallback: VisitWithRelations,
      operational: KioskOperationalSnapshot,
    ): Promise<"routed" | "success" | "error"> => {
      if (outcome.kind === "approval-required") {
        resolvingRef.current = false;
        setApprovalVisit(outcome.visit);
        setFlowPhase("approval-pending");
        setOverlay("idle");
        return "routed";
      }

      if (outcome.kind === "pending") {
        resolvingRef.current = false;
        setApprovalVisit(outcome.visit);
        setFlowPhase("approval-wait");
        setOverlay("idle");
        return "routed";
      }

      if (outcome.kind === "error") {
        if (isPolicyCaptureErrorCode(outcome.code)) {
          resolvingRef.current = false;
          resetCaptureState();
          setPendingCapture({
            visit: visitFallback,
            requirePhoto: getOperationalForBranch(
              operational,
              visitFallback.branchId,
            ).requireVisitorPhoto,
            requireDocuments: getOperationalForBranch(
              operational,
              visitFallback.branchId,
            ).requireVisitorDocuments,
          });
          setFlowPhase("capture-required");
          setOverlay("idle");
          return "routed";
        }

        return "error";
      }

      return "success";
    },
    [resetCaptureState],
  );

  const handleCaptureContinue = useCallback(async () => {
    if (!pendingCapture || captureExecuting) {
      return;
    }

    const validation = validateKioskCapture({
      requirePhoto,
      requireDocuments,
      photoUrl,
      documents,
    });

    if (!validation.valid) {
      setCaptureError(validation.message);
      return;
    }

    setCaptureError(null);
    setCaptureExecuting(true);

    try {
      const snapshot =
        operationalSnapshotRef.current ??
        (await fetchKioskOperationalSnapshot());
      operationalSnapshotRef.current = snapshot;

      const outcome = await runKioskCheckIn({
        visitId: pendingCapture.visit.id,
        visitorId: pendingCapture.visit.visitor.id,
        photoUrl,
        documents,
        source: "reception",
      });

      const routed = await routeCheckInOutcome(
        outcome,
        pendingCapture.visit,
        snapshot,
      );

      if (routed === "routed") {
        resetCaptureState();
        return;
      }

      if (routed === "error") {
        setCaptureError(
          outcome.kind === "error" ? outcome.message : "Check-in failed.",
        );
        return;
      }

      if (outcome.kind !== "checked-in") {
        return;
      }

      const successResult = {
        kind: "check-in" as const,
        visit: outcome.visit,
        badge: outcome.badge ?? null,
      };

      resetCaptureState();
      setFlowPhase("scan");
      applyScanSuccess(
        successResult,
        setOverlay,
        setFeedback,
        setBadgeVisit,
        setBadgeInitial,
        setBadgeModalOpen,
      );
      scheduleResume();
    } catch (error) {
      setCaptureError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Check-in failed. Please try again.",
      );
    } finally {
      setCaptureExecuting(false);
    }
  }, [
    captureExecuting,
    documents,
    pendingCapture,
    photoUrl,
    requireDocuments,
    requirePhoto,
    resetCaptureState,
    routeCheckInOutcome,
    scheduleResume,
  ]);

  const handlePendingApproved = useCallback(
    async (visit: VisitWithRelations) => {
      setApprovalExecuting(true);

      try {
        const snapshot =
          operationalSnapshotRef.current ??
          (await fetchKioskOperationalSnapshot());
        operationalSnapshotRef.current = snapshot;

        const outcome = await runKioskCheckIn({
          visitId: visit.id,
          visitorId: visit.visitor.id,
          source: "reception",
        });

        const routed = await routeCheckInOutcome(outcome, visit, snapshot);

        if (routed === "error") {
          setScanError({
            title: "Check-in failed",
            message:
              outcome.kind === "error"
                ? outcome.message
                : "Check-in failed after approval.",
          });
          setFlowPhase("scan");
          scheduleScannerRemount();
          return;
        }

        if (routed === "routed") {
          return;
        }

        if (outcome.kind !== "checked-in") {
          return;
        }

        setApprovalVisit(null);
        setFlowPhase("scan");
        applyScanSuccess(
          {
            kind: "check-in",
            visit: outcome.visit,
            badge: outcome.badge ?? null,
          },
          setOverlay,
          setFeedback,
          setBadgeVisit,
          setBadgeInitial,
          setBadgeModalOpen,
        );
        scheduleResume();
      } catch (error) {
        setScanError({
          title: "Check-in failed",
          message:
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Check-in failed after approval.",
        });
        setFlowPhase("scan");
        scheduleScannerRemount();
      } finally {
        setApprovalExecuting(false);
      }
    },
    [routeCheckInOutcome, scheduleResume, scheduleScannerRemount],
  );

  const handleApprovalResolved = useCallback(
    async (visit: VisitWithRelations) => {
      setApprovalExecuting(true);

      try {
        const outcome = await completeKioskApprovalOutcome({
          visit,
          visitorId: visit.visitor.id,
          source: "reception",
        });

        if (outcome.kind === "pending") {
          setApprovalVisit(outcome.visit);
          setFlowPhase("approval-wait");
          return;
        }

        if (outcome.kind === "approval-required") {
          setApprovalVisit(outcome.visit);
          setFlowPhase("approval-pending");
          return;
        }

        if (outcome.kind === "error") {
          setScanError({
            title: "Check-in failed",
            message: outcome.message,
          });
          setFlowPhase("scan");
          scheduleScannerRemount();
          return;
        }

        setApprovalVisit(null);
        setFlowPhase("scan");
        applyScanSuccess(
          {
            kind: "check-in",
            visit: outcome.visit,
            badge: outcome.badge ?? null,
          },
          setOverlay,
          setFeedback,
          setBadgeVisit,
          setBadgeInitial,
          setBadgeModalOpen,
        );
        scheduleResume();
      } finally {
        setApprovalExecuting(false);
      }
    },
    [scheduleResume, scheduleScannerRemount],
  );

  const handleApprovalRejected = useCallback(() => {
    clearRejectionTimer();
    setScanError({
      title: "Check-in denied",
      message: kioskApprovalRejectionOutcome().message,
    });
    setApprovalVisit(null);
    setFlowPhase("scan");
    resolvingRef.current = false;
    setResolving(false);
    setOverlay("idle");
    scheduleScannerRemount();

    rejectionTimerRef.current = window.setTimeout(() => {
      setScanError(null);
      rejectionTimerRef.current = null;
    }, KIOSK_ERROR_AUTO_RETURN_MS);
  }, [clearRejectionTimer, scheduleScannerRemount]);

  const handleScan = useCallback(
    async (decodedToken: string) => {
      if (resolvingRef.current) {
        ignoreScan("SCAN_IGNORED_RESOLVING");
        return;
      }

      if (flowPhaseRef.current !== "scan") {
        ignoreScan("SCAN_IGNORED_PHASE");
        return;
      }

      resolvingRef.current = true;
      setResolving(true);
      setOverlay("processing");
      setFeedback(null);
      setScanError(null);
      setScanHint(null);

      try {
        const snapshot =
          operationalSnapshotRef.current ??
          (await fetchKioskOperationalSnapshot().catch(() => {
            if (!operationalWarningShownRef.current) {
              operationalWarningShownRef.current = true;
              setOperationalLoadWarning(true);
            }
            return null;
          }));

        if (snapshot) {
          operationalSnapshotRef.current = snapshot;
        }

        const resolved = await resolveQrWithRetry(decodedToken, {
          shouldAbort: () => flowPhaseRef.current !== "scan",
        });

        if (resolved.kind === "aborted") {
          return;
        }

        if (resolved.kind === "failed") {
          setScanError({
            title: resolved.title,
            message: resolved.message,
          });
          return;
        }

        if (!operationalSnapshotRef.current) {
          setScanError({
            title: "Settings unavailable",
            message:
              "Branch settings could not be loaded. Please try again or use manual lookup.",
          });
          return;
        }

        const result = await processReceptionVisit(
          resolved.visit,
          operationalSnapshotRef.current,
        );

        if (result.kind === "capture-required") {
          resetCaptureState();
          setPendingCapture({
            visit: result.visit,
            requirePhoto: result.requirePhoto,
            requireDocuments: result.requireDocuments,
          });
          setFlowPhase("capture-required");
          setOverlay("idle");
          return;
        }

        if (result.kind === "approval-wait") {
          setApprovalVisit(result.visit);
          setFlowPhase("approval-wait");
          setOverlay("idle");
          return;
        }

        if (result.kind === "approval-pending") {
          setApprovalVisit(result.visit);
          setFlowPhase("approval-pending");
          setOverlay("idle");
          return;
        }

        applyScanSuccess(
          result,
          setOverlay,
          setFeedback,
          setBadgeVisit,
          setBadgeInitial,
          setBadgeModalOpen,
        );
        scheduleResume();
      } catch (error) {
        setScanError({
          title: "Scan failed",
          message:
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Scan failed. Please try again.",
        });
      } finally {
        resolvingRef.current = false;
        setResolving(false);
      }
    },
    [ignoreScan, resetCaptureState, scheduleResume],
  );

  useEffect(() => {
    return () => {
      clearResumeTimer();
      clearResetStabilizeTimer();
      clearRejectionTimer();
    };
  }, [clearRejectionTimer, clearResetStabilizeTimer, clearResumeTimer]);

  const cameraFailed =
    flowPhase === "scan" &&
    !scanError &&
    cameraStatus !== "loading" &&
    cameraStatus !== "ready";

  const scannerActive =
    flowPhase === "scan" && !scanError && !cameraFailed && scannerReady;

  const badgeModal = (
    <BadgePreviewModal
      visit={badgeVisit}
      open={badgeModalOpen}
      onClose={() => {
        setBadgeModalOpen(false);
        setBadgeInitial(null);
      }}
      initialBadge={badgeInitial}
    />
  );

  const operationalWarningBanner = operationalLoadWarning ? (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      Some branch settings could not be loaded. Using safe defaults.
    </p>
  ) : null;

  if (flowPhase === "approval-wait" && approvalVisit) {
    return (
      <>
        <ScannerFrame
          embedded={embedded}
          title="QR scanner"
          subtitle="Waiting for visit approval"
        >
          {operationalWarningBanner}
          <KioskPendingApprovalScreen
            visit={approvalVisit}
            onApproved={(visit) => void handlePendingApproved(visit)}
            onRejected={handleApprovalRejected}
            onCancel={dismissScanner}
            subtitle="Staff can approve from the visit drawer while this screen polls for updates"
          />
        </ScannerFrame>
        {badgeModal}
      </>
    );
  }

  if (flowPhase === "approval-pending" && approvalVisit) {
    return (
      <>
        <ScannerFrame
          embedded={embedded}
          title="QR scanner"
          subtitle="Check-in approval required"
        >
          {operationalWarningBanner}
          <KioskApprovalPending
            visit={approvalVisit}
            onApproved={(visit) => void handleApprovalResolved(visit)}
            onRejected={handleApprovalRejected}
            subtitle="Awaiting staff approval to complete check-in"
          />
          {approvalExecuting ? (
            <p className="text-center text-xs text-[var(--muted)]">
              Completing check-in…
            </p>
          ) : null}
          <div>
            <Button
              type="button"
              variant="secondary"
              disabled={approvalExecuting}
              onClick={dismissScanner}
            >
              Close
            </Button>
          </div>
        </ScannerFrame>
        {badgeModal}
      </>
    );
  }

  if (flowPhase === "capture-required" && pendingCapture) {
    return (
      <>
        <ScannerFrame
          embedded={embedded}
          title="Capture required"
          subtitle="Photo and/or documents are required before check-in can continue."
          contentClassName="space-y-4"
        >
          <p className="text-sm text-[var(--muted)]">
            {visitorDisplayName(pendingCapture.visit)} ·{" "}
            {pendingCapture.visit.branch.name}
          </p>
          {operationalWarningBanner}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="min-w-0 space-y-4">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                  <KioskPhotoCapture
                    captureType="photo"
                    photoUrl={photoUrl}
                    onPhotoChange={setPhotoUrl}
                    disabled={captureExecuting}
                    required={requirePhoto}
                    compact
                    cameraActive
                  />
                </div>

                {requireDocuments ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                    <KioskDocumentCapture
                      documents={documents}
                      onChange={setDocuments}
                      disabled={captureExecuting}
                      required={requireDocuments}
                      compact
                    />
                  </div>
                ) : null}
              </div>

              <aside className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted)]">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Requirements
                </p>
                <ul className="mt-2 space-y-1">
                  <li>
                    Visitor photo:{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      {requirePhoto ? "Required" : "Not required"}
                    </span>
                  </li>
                  <li>
                    Supporting documents:{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      {requireDocuments ? "Required" : "Not required"}
                    </span>
                  </li>
                </ul>
              </aside>
            </div>

            {captureError ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {captureError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={captureExecuting}
                onClick={handleCaptureCancel}
              >
                Close
              </Button>
              <Button
                type="button"
                disabled={!captureReady || captureExecuting}
                onClick={() => {
                  void handleCaptureContinue();
                }}
              >
                {captureExecuting ? "Checking in…" : "Continue check-in"}
              </Button>
            </div>
        </ScannerFrame>
        {badgeModal}
      </>
    );
  }

  return (
    <>
      <ScannerFrame
        embedded={embedded}
        title="QR scanner"
        subtitle="Scan visitor QR for check-in or check-out"
      >
          {operationalWarningBanner}

          <KioskScanHint hint={scanHint} />

          {scanError ? (
            <KioskQrRecoverPanel
              title={scanError.title}
              message={scanError.message}
              primaryLabel="Retry scan"
              onPrimary={handleRetryScan}
              onFindBooking={() => onManualLookup?.()}
              onHome={dismissScanner}
              secondaryLabel="Manual lookup"
              tertiaryLabel="Close"
            />
          ) : null}

          {cameraFailed ? (
            <KioskQrCameraRecoverPanel
              {...cameraRecoverCopy(cameraStatus)}
              onRetry={restartCamera}
              onFindBooking={() => onManualLookup?.()}
              onHome={dismissScanner}
              secondaryLabel="Manual lookup"
              tertiaryLabel="Close"
              middleLabel="Retry scan"
              onMiddle={handleRetryScan}
            />
          ) : null}

          {scannerActive ? (
            <div className="relative">
              <KioskQrScanner
                active
                scannerKey={scannerKey}
                resolving={resolving || overlay === "processing"}
                onScan={(token) => void handleScan(token)}
                onCameraStatus={setCameraStatus}
                onRestart={restartCamera}
              />

              {overlay === "success" && feedback ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-emerald-600/90 px-4 text-center">
                  <p className="text-lg font-semibold text-[var(--on-brand)]">
                    {feedback.visitorName}
                  </p>
                  <p className="mt-1 text-sm text-emerald-100">
                    {feedback.statusLabel}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {!scanError && !cameraFailed && !scannerReady ? (
            <p className="text-center text-sm text-[var(--muted)]">Preparing scanner…</p>
          ) : null}
      </ScannerFrame>

      {badgeModal}
    </>
  );
}
