"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { KioskApprovalPending } from "@/components/kiosk/kiosk-approval-pending";
import { KioskPendingApprovalScreen } from "@/components/kiosk/kiosk-pending-approval-screen";
import { LiveActivityPanel } from "@/components/reception/live-activity-panel";
import { QrScannerDrawer } from "@/components/reception/qr-scanner-drawer";
import { ReceptionActionBar } from "@/components/reception/reception-action-bar";
import { ReceptionCommandCenter } from "@/components/reception/reception-command-center";
import { ReceptionOperationsWorkspace } from "@/components/reception/reception-operations-workspace";
import {
  ReceptionWorkspaceNav,
  type ReceptionWorkspace,
} from "@/components/reception/reception-workspace-nav";
import {
  VisitOverrideModal,
  type VisitOverrideKind,
} from "@/components/reception/visit-override-modal";
import { UnifiedSearchPanel } from "@/components/search/unified-search-panel";
import { VisitorProfileDrawer } from "@/components/visitors/visitor-profile-drawer";
import { BadgePreviewModal } from "@/components/visits/badge-preview-modal";
import { QrCodeModal } from "@/components/visits/qr-code-modal";
import { VisitDetailsDrawer } from "@/components/visits/visit-details-drawer";
import { Button } from "@/components/ui/button";
import { KIOSK_ERROR_AUTO_RETURN_MS } from "@/components/kiosk/kiosk-ui";
import { VisitStatus } from "@prisma/client";
import type { VisitorRecord } from "@/lib/api/visitors";
import {
  cancelVisit,
  checkInVisit,
  checkOutVisit,
  forceCheckInVisit,
  forceCheckOutVisit,
  getVisit,
  listVisits,
} from "@/lib/api/visits";
import { ApiError } from "@/lib/api/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type {
  AbandonedRegistrationStage,
  KioskRecoveryStep,
} from "@/lib/api/reception";
import {
  completeKioskApprovalOutcome,
  kioskApprovalRejectionOutcome,
} from "@/lib/kiosk/kiosk-check-in-workflow";
import {
  canCheckInVisit,
  canPrintVisitBadge,
  isVisitAwaitingPreVisitApproval,
} from "@/lib/visits/actions";
import { detachVisitWithRelations } from "@/lib/visits/detach";
import type { ThermalBadgeData } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

type LookupMode = "default" | "today" | "approvals";
type ManualApprovalMode = "approval-wait" | "approval-pending" | null;

function toVisitorRecord(
  visitor: Pick<
    VisitorRecord,
    "id" | "firstName" | "lastName" | "email" | "phone" | "company" | "photoUrl"
  >,
): VisitorRecord {
  return {
    id: visitor.id,
    organizationId: "",
    firstName: visitor.firstName,
    lastName: visitor.lastName,
    email: visitor.email ?? null,
    phone: visitor.phone ?? null,
    company: visitor.company ?? null,
    photoUrl: visitor.photoUrl ?? null,
    notes: null,
    createdAt: "",
    updatedAt: "",
  };
}

export function ReceptionConsoleShell() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const actionLockRef = useRef(false);

  const [workspace, setWorkspace] = useState<ReceptionWorkspace>("command");
  const [selectedVisit, setSelectedVisit] = useState<VisitWithRelations | null>(
    null,
  );
  const [lookupMode, setLookupMode] = useState<LookupMode>("default");
  const [focusSearchNonce, setFocusSearchNonce] = useState(0);
  const [activityRefreshNonce, setActivityRefreshNonce] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [operationsBadge, setOperationsBadge] = useState(0);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [busyVisitId, setBusyVisitId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVisitId, setDrawerVisitId] = useState<string | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<
    "overview" | "approval" | "checkin" | "audit" | "activity"
  >("overview");

  const [profileVisitor, setProfileVisitor] = useState<VisitorRecord | null>(
    null,
  );
  const [profileOpen, setProfileOpen] = useState(false);

  const [qrVisit, setQrVisit] = useState<VisitWithRelations | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const [badgeVisit, setBadgeVisit] = useState<VisitWithRelations | null>(null);
  const [badgeInitial, setBadgeInitial] = useState<ThermalBadgeData | null>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);

  const [actionToast, setActionToast] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [manualApprovalMode, setManualApprovalMode] =
    useState<ManualApprovalMode>(null);
  const [manualApprovalVisit, setManualApprovalVisit] =
    useState<VisitWithRelations | null>(null);
  const [manualApprovalBusy, setManualApprovalBusy] = useState(false);
  const [manualRejectionMessage, setManualRejectionMessage] = useState<
    string | null
  >(null);
  const [overrideTarget, setOverrideTarget] = useState<{
    visitId: string;
    visitorName: string;
    kind: VisitOverrideKind;
  } | null>(null);

  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const canForceCheckIn = permissions.includes(PERMISSIONS.VISIT_FORCE_CHECKIN);
  const canForceCheckOut = permissions.includes(
    PERMISSIONS.VISIT_FORCE_CHECKOUT,
  );

  const bumpActivity = useCallback(() => {
    setActivityRefreshNonce((value) => value + 1);
  }, []);

  const showToast = useCallback((message: string) => {
    setActionToast(message);
    window.setTimeout(() => setActionToast(null), 3000);
  }, []);

  const openVisitDrawer = useCallback(
    (
      visitId: string,
      tab:
        | "overview"
        | "approval"
        | "checkin"
        | "audit"
        | "activity" = "overview",
    ) => {
      setDrawerVisitId(visitId);
      setDrawerInitialTab(tab);
      setDrawerOpen(true);
    },
    [],
  );

  const loadVisitForAction = useCallback(async (visitId: string) => {
    const detail = await getVisit(visitId);
    return detachVisitWithRelations(detail);
  }, []);

  const handleSelectVisit = useCallback((visit: VisitWithRelations) => {
    const detached = detachVisitWithRelations(visit);
    setSelectedVisit(detached);

    if (isVisitAwaitingPreVisitApproval(detached.status)) {
      setManualApprovalVisit(detached);
      setManualApprovalMode("approval-wait");
      return;
    }

    if (manualApprovalVisit?.id === detached.id) {
      return;
    }

    setManualApprovalMode(null);
    setManualApprovalVisit(null);
  }, [manualApprovalVisit?.id]);

  const handleSelectVisitor = useCallback(
    async (visitorId: string) => {
      try {
        const result = await listVisits({ visitorId, limit: 1 });
        if (result.items[0]) {
          handleSelectVisit(detachVisitWithRelations(result.items[0]));
        } else {
          showToast("No visits found for this visitor.");
        }
      } catch (err) {
        showToast(
          err instanceof ApiError
            ? err.message
            : "Could not load visits for this visitor.",
        );
      }
    },
    [handleSelectVisit, showToast],
  );

  const clearManualApprovalFlow = useCallback(() => {
    setManualApprovalMode(null);
    setManualApprovalVisit(null);
    setManualApprovalBusy(false);
  }, []);

  const completeManualCheckIn = useCallback(
    (visit: VisitWithRelations, badge?: ThermalBadgeData | null) => {
      const nextVisit = detachVisitWithRelations(visit);
      setSelectedVisit(nextVisit);
      bumpActivity();
      clearManualApprovalFlow();
      showToast(`${nextVisit.visitor.firstName} checked in`);

      if (badge) {
        setBadgeVisit(nextVisit);
        setBadgeInitial(badge);
        setBadgeModalOpen(true);
      }
    },
    [bumpActivity, clearManualApprovalFlow, showToast],
  );

  const handleManualPendingApproved = useCallback(
    async (visit: VisitWithRelations) => {
      if (actionLockRef.current || manualApprovalBusy) {
        return;
      }

      actionLockRef.current = true;
      setManualApprovalBusy(true);

      try {
        const result = await checkInVisit(visit.id, { source: "reception" });

        if (result.state === "APPROVAL_REQUIRED") {
          setManualApprovalVisit(detachVisitWithRelations(result.visit));
          setManualApprovalMode("approval-pending");
          setSelectedVisit(detachVisitWithRelations(result.visit));
          openVisitDrawer(result.visit.id, "approval");
          return;
        }

        if (result.state === "PENDING") {
          setManualApprovalVisit(detachVisitWithRelations(result.visit));
          setManualApprovalMode("approval-wait");
          setSelectedVisit(detachVisitWithRelations(result.visit));
          openVisitDrawer(result.visit.id, "approval");
          return;
        }

        if (result.state !== "CHECKED_IN") {
          showToast("Check-in could not be completed.");
          return;
        }

        completeManualCheckIn(result.visit, result.badge);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : "Check-in failed.");
      } finally {
        actionLockRef.current = false;
        setManualApprovalBusy(false);
      }
    },
    [completeManualCheckIn, openVisitDrawer, showToast, manualApprovalBusy],
  );

  const handleManualApprovalResolved = useCallback(
    async (visit: VisitWithRelations) => {
      if (actionLockRef.current || manualApprovalBusy) {
        return;
      }

      actionLockRef.current = true;
      setManualApprovalBusy(true);

      try {
        const outcome = await completeKioskApprovalOutcome({
          visit,
          visitorId: visit.visitor.id,
          source: "reception",
        });

        if (outcome.kind === "approval-required") {
          setManualApprovalVisit(outcome.visit);
          setManualApprovalMode("approval-pending");
          return;
        }

        if (outcome.kind === "error") {
          showToast(outcome.message);
          return;
        }

        if (outcome.kind !== "checked-in") {
          return;
        }

        completeManualCheckIn(outcome.visit, outcome.badge);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : "Check-in failed.");
      } finally {
        actionLockRef.current = false;
        setManualApprovalBusy(false);
      }
    },
    [completeManualCheckIn, showToast, manualApprovalBusy],
  );

  const handleManualApprovalRejected = useCallback(() => {
    const message = kioskApprovalRejectionOutcome().message;
    setManualRejectionMessage(message);
    clearManualApprovalFlow();
    window.setTimeout(() => {
      setManualRejectionMessage(null);
    }, KIOSK_ERROR_AUTO_RETURN_MS);
  }, [clearManualApprovalFlow]);

  const handleCheckInVisitId = useCallback(
    async (visitId: string) => {
      if (actionLockRef.current) {
        return;
      }

      actionLockRef.current = true;
      setBusyVisitId(visitId);
      setActionBusy(true);

      try {
        const visit = await loadVisitForAction(visitId);
        setSelectedVisit(visit);

        if (!canCheckInVisit(visit.status)) {
          showToast("This visit cannot be checked in.");
          return;
        }

        const result = await checkInVisit(visitId, { source: "reception" });

        if (result.state === "APPROVAL_REQUIRED") {
          setManualApprovalVisit(detachVisitWithRelations(result.visit));
          setManualApprovalMode("approval-pending");
          setSelectedVisit(detachVisitWithRelations(result.visit));
          openVisitDrawer(visitId, "approval");
          return;
        }

        if (result.state === "PENDING") {
          setManualApprovalVisit(detachVisitWithRelations(result.visit));
          setManualApprovalMode("approval-wait");
          setSelectedVisit(detachVisitWithRelations(result.visit));
          openVisitDrawer(visitId, "approval");
          return;
        }

        if (result.state !== "CHECKED_IN") {
          showToast("Check-in could not be completed.");
          return;
        }

        completeManualCheckIn(result.visit, result.badge);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : "Check-in failed.");
      } finally {
        actionLockRef.current = false;
        setBusyVisitId(null);
        setActionBusy(false);
      }
    },
    [completeManualCheckIn, loadVisitForAction, openVisitDrawer, showToast],
  );

  const handleCheckOutVisitId = useCallback(
    async (visitId: string) => {
      if (actionLockRef.current) {
        return;
      }

      actionLockRef.current = true;
      setBusyVisitId(visitId);
      setActionBusy(true);

      try {
        const result = await checkOutVisit(visitId);
        const nextVisit = detachVisitWithRelations(result.visit);
        setSelectedVisit((current) =>
          current?.id === nextVisit.id ? nextVisit : current,
        );
        bumpActivity();
        showToast(`${nextVisit.visitor.firstName} checked out`);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : "Check-out failed.");
      } finally {
        actionLockRef.current = false;
        setBusyVisitId(null);
        setActionBusy(false);
      }
    },
    [bumpActivity, showToast],
  );

  const handlePrintBadgeVisitId = useCallback(
    async (visitId: string) => {
      try {
        const visit = await loadVisitForAction(visitId);
        if (!canPrintVisitBadge(visit.status)) {
          showToast("Badge is not available for this visit.");
          return;
        }

        setBadgeVisit(visit);
        setBadgeInitial(null);
        setBadgeModalOpen(true);
      } catch (err) {
        showToast(
          err instanceof ApiError ? err.message : "Could not open badge preview.",
        );
      }
    },
    [loadVisitForAction, showToast],
  );

  const handleOpenVisitor360 = useCallback(
    async (visitorId: string) => {
      try {
        const visitList = await listVisits({ visitorId, limit: 1 });
        const visitor = visitList.items[0]?.visitor;

        if (!visitor) {
          showToast("Could not load visitor profile.");
          return;
        }

        setProfileVisitor(toVisitorRecord(visitor));
        setProfileOpen(true);
      } catch (err) {
        showToast(
          err instanceof ApiError ? err.message : "Could not open visitor profile.",
        );
      }
    },
    [showToast],
  );

  const handleOpenVisitDetails = useCallback(
    (
      visitId: string,
      tab:
        | "overview"
        | "approval"
        | "checkin"
        | "audit"
        | "activity" = "overview",
    ) => {
      openVisitDrawer(visitId, tab);
    },
    [openVisitDrawer],
  );

  const handleResumeKiosk = useCallback(
    (visitId: string, step: KioskRecoveryStep) => {
      const tab =
        step === "approval_wait"
          ? "approval"
          : step === "identity"
            ? "overview"
            : "checkin";
      openVisitDrawer(visitId, tab);
    },
    [openVisitDrawer],
  );

  const handleCancelSession = useCallback(
    async (visitId: string) => {
      if (actionLockRef.current) {
        return;
      }

      actionLockRef.current = true;
      setBusyVisitId(visitId);
      setActionBusy(true);

      try {
        await cancelVisit(visitId, "Kiosk session cancelled at reception");
        bumpActivity();
        showToast("Kiosk session cancelled.");
      } catch (err) {
        showToast(
          err instanceof ApiError ? err.message : "Could not cancel session.",
        );
      } finally {
        actionLockRef.current = false;
        setBusyVisitId(null);
        setActionBusy(false);
      }
    },
    [bumpActivity, showToast],
  );

  const handleResumeRegistration = useCallback(
    (visitId: string, stage: AbandonedRegistrationStage) => {
      const tab =
        stage === "registration"
          ? "overview"
          : stage === "capture"
            ? "checkin"
            : "checkin";
      openVisitDrawer(visitId, tab);
    },
    [openVisitDrawer],
  );

  const handleCompleteAtReception = useCallback(
    (visitId: string) => {
      openVisitDrawer(visitId, "checkin");
    },
    [openVisitDrawer],
  );

  const handleCancelRegistration = useCallback(
    async (visitId: string) => {
      if (actionLockRef.current) {
        return;
      }

      actionLockRef.current = true;
      setBusyVisitId(visitId);
      setActionBusy(true);

      try {
        await cancelVisit(visitId, "Walk-in registration cancelled at reception");
        bumpActivity();
        showToast("Registration cancelled.");
      } catch (err) {
        showToast(
          err instanceof ApiError
            ? err.message
            : "Could not cancel registration.",
        );
      } finally {
        actionLockRef.current = false;
        setBusyVisitId(null);
        setActionBusy(false);
      }
    },
    [bumpActivity, showToast],
  );

  const openForceOverride = useCallback(
    async (visitId: string, kind: VisitOverrideKind) => {
      try {
        const visit = await loadVisitForAction(visitId);
        setOverrideTarget({
          visitId,
          kind,
          visitorName: `${visit.visitor.firstName} ${visit.visitor.lastName}`.trim(),
        });
      } catch (err) {
        showToast(
          err instanceof ApiError ? err.message : "Could not load visit.",
        );
      }
    },
    [loadVisitForAction, showToast],
  );

  const handleForceOverrideConfirm = useCallback(
    async (payload: { reason: string; note?: string }) => {
      if (!overrideTarget || actionLockRef.current) {
        return;
      }

      actionLockRef.current = true;
      setBusyVisitId(overrideTarget.visitId);
      setActionBusy(true);

      try {
        if (overrideTarget.kind === "force-check-in") {
          const result = await forceCheckInVisit(overrideTarget.visitId, payload);
          completeManualCheckIn(result.visit);
          showToast(`${result.visit.visitor.firstName} force checked in`);
        } else {
          const result = await forceCheckOutVisit(overrideTarget.visitId, payload);
          const nextVisit = detachVisitWithRelations(result.visit);
          setSelectedVisit((current) =>
            current?.id === nextVisit.id ? nextVisit : current,
          );
          bumpActivity();
          showToast(`${nextVisit.visitor.firstName} force checked out`);
        }

        setOverrideTarget(null);
      } catch (err) {
        showToast(
          err instanceof ApiError ? err.message : "Override action failed.",
        );
      } finally {
        actionLockRef.current = false;
        setBusyVisitId(null);
        setActionBusy(false);
      }
    },
    [bumpActivity, completeManualCheckIn, overrideTarget, showToast],
  );

  const handlePrintBadgeSelected = useCallback(() => {
    if (!selectedVisit) {
      return;
    }

    void handlePrintBadgeVisitId(selectedVisit.id);
  }, [handlePrintBadgeVisitId, selectedVisit]);

  const handleVisitUpdated = useCallback(
    (visit: VisitWithRelations) => {
      const nextVisit = detachVisitWithRelations(visit);
      setSelectedVisit((current) =>
        current?.id === nextVisit.id ? nextVisit : current,
      );
      setManualApprovalVisit((current) =>
        current?.id === nextVisit.id ? nextVisit : current,
      );

      if (
        manualApprovalMode === "approval-wait" &&
        nextVisit.status !== VisitStatus.PENDING
      ) {
        if (nextVisit.status === VisitStatus.APPROVED) {
          setManualApprovalMode(null);
          setManualApprovalVisit(null);
        }
      }

      bumpActivity();
    },
    [bumpActivity, manualApprovalMode],
  );

  const switchToSearch = useCallback((mode: LookupMode = "default") => {
    setWorkspace("search");
    setLookupMode(mode);
    setFocusSearchNonce((value) => value + 1);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  const openQrScanner = useCallback(() => {
    setQrScannerOpen(true);
  }, []);

  const sharedVisitHandlers = {
    onCheckIn: (visitId: string) => void handleCheckInVisitId(visitId),
    onCheckOut: (visitId: string) => void handleCheckOutVisitId(visitId),
    onPrintBadge: (visitId: string) => void handlePrintBadgeVisitId(visitId),
    onOpenVisitor360: (visitorId: string) => void handleOpenVisitor360(visitorId),
    onOpenVisitDetails: handleOpenVisitDetails,
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Reception
          </h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            Operational console for visitor check-in and front-desk workflows
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/visits/new">
            <Button type="button" variant="secondary" size="sm" className="h-8 text-xs">
              Schedule visit
            </Button>
          </Link>
          <Link href="/kiosk">
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs">
              Open kiosk
            </Button>
          </Link>
        </div>
      </header>

      <ReceptionActionBar
        permissions={permissions}
        pendingApprovals={pendingApprovals}
        canPrintBadge={
          Boolean(selectedVisit) && canPrintVisitBadge(selectedVisit!.status)
        }
        onScanQr={openQrScanner}
        onSearch={() => switchToSearch("default")}
        onPendingApprovals={() => setWorkspace("command")}
        onPrintBadge={handlePrintBadgeSelected}
      />

      <ReceptionWorkspaceNav
        active={workspace}
        onChange={setWorkspace}
        operationsBadge={operationsBadge}
      />

      {manualRejectionMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {manualRejectionMessage}
        </p>
      ) : null}

      {actionToast ? (
        <p className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--foreground)]">
          {actionToast}
        </p>
      ) : null}

      {manualApprovalMode === "approval-wait" && manualApprovalVisit ? (
        <KioskPendingApprovalScreen
          visit={manualApprovalVisit}
          onApproved={(visit) => void handleManualPendingApproved(visit)}
          onRejected={handleManualApprovalRejected}
          onCancel={clearManualApprovalFlow}
          subtitle="Approve this visit from the drawer or wait for status to update"
        />
      ) : null}

      {manualApprovalMode === "approval-pending" && manualApprovalVisit ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <KioskApprovalPending
            visit={manualApprovalVisit}
            onApproved={(visit) => void handleManualApprovalResolved(visit)}
            onRejected={handleManualApprovalRejected}
            subtitle="Staff approval is required before this visit can be checked in"
          />
          {manualApprovalBusy ? (
            <p className="text-center text-xs text-[var(--muted)]">
              Completing check-in…
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={manualApprovalBusy}
              onClick={() => openVisitDrawer(manualApprovalVisit.id, "approval")}
            >
              Open approval drawer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={manualApprovalBusy}
              onClick={clearManualApprovalFlow}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      <div className="min-w-0">
        {workspace === "command" ? (
          <ReceptionCommandCenter
            refreshNonce={activityRefreshNonce}
            busyVisitId={busyVisitId}
            onMetricsLoaded={(metrics) =>
              setPendingApprovals(metrics.pendingApprovals)
            }
            {...sharedVisitHandlers}
            onOpenVisitHistory={(visitId) => openVisitDrawer(visitId, "audit")}
            onScanQr={openQrScanner}
            onFocusSearch={() => switchToSearch("default")}
            onOperationalCountChange={setOperationsBadge}
            canForceCheckIn={canForceCheckIn}
            canForceCheckOut={canForceCheckOut}
            onForceCheckIn={(visitId) =>
              void openForceOverride(visitId, "force-check-in")
            }
            onForceCheckOut={(visitId) =>
              void openForceOverride(visitId, "force-check-out")
            }
          />
        ) : null}

        {workspace === "search" ? (
          <UnifiedSearchPanel
            searchInputRef={searchInputRef}
            focusSearchNonce={focusSearchNonce}
            presetMode={
              lookupMode === "today"
                ? "today"
                : lookupMode === "approvals"
                  ? "approvals"
                  : null
            }
            selectedVisitId={selectedVisit?.id ?? null}
            busyVisitId={busyVisitId}
            onSelectVisit={handleSelectVisit}
            onOpenSelectedVisit={() => {
              if (selectedVisit) {
                openVisitDrawer(
                  selectedVisit.id,
                  lookupMode === "approvals" ? "approval" : "overview",
                );
              }
            }}
            onSelectVisitor={(visitor) => void handleSelectVisitor(visitor.id)}
            {...sharedVisitHandlers}
          />
        ) : null}

        {workspace === "operations" ? (
          <ReceptionOperationsWorkspace
            refreshNonce={activityRefreshNonce}
            busyVisitId={busyVisitId}
            {...sharedVisitHandlers}
            onResumeKiosk={handleResumeKiosk}
            onCancelSession={(visitId) => void handleCancelSession(visitId)}
            onResumeRegistration={handleResumeRegistration}
            onCompleteAtReception={handleCompleteAtReception}
            onCancelRegistration={(visitId) =>
              void handleCancelRegistration(visitId)
            }
            canForceCheckIn={canForceCheckIn}
            canForceCheckOut={canForceCheckOut}
            onForceCheckIn={(visitId) =>
              void openForceOverride(visitId, "force-check-in")
            }
            onForceCheckOut={(visitId) =>
              void openForceOverride(visitId, "force-check-out")
            }
            onOperationsCountChange={setOperationsBadge}
          />
        ) : null}

        {workspace === "activity" ? (
          <LiveActivityPanel
            refreshNonce={activityRefreshNonce}
            onSelectVisit={(visitId, tab) => openVisitDrawer(visitId, tab)}
          />
        ) : null}
      </div>

      <QrScannerDrawer
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onManualLookup={() => switchToSearch("default")}
      />

      <VisitDetailsDrawer
        visitId={drawerVisitId}
        open={drawerOpen}
        initialTab={drawerInitialTab}
        onClose={() => setDrawerOpen(false)}
        onVisitUpdated={handleVisitUpdated}
        onGenerateQr={(visit) => {
          setQrVisit(visit);
          setQrModalOpen(true);
        }}
        onPrintBadge={(visit, badge) => {
          setBadgeVisit(visit);
          setBadgeInitial(badge ?? null);
          setBadgeModalOpen(true);
        }}
      />

      <VisitorProfileDrawer
        visitor={profileVisitor}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      <QrCodeModal
        visit={qrVisit}
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />

      <BadgePreviewModal
        visit={badgeVisit}
        open={badgeModalOpen}
        onClose={() => {
          setBadgeModalOpen(false);
          setBadgeInitial(null);
        }}
        initialBadge={badgeInitial}
      />

      <VisitOverrideModal
        open={overrideTarget !== null}
        kind={overrideTarget?.kind ?? "force-check-in"}
        visitorName={overrideTarget?.visitorName ?? ""}
        busy={actionBusy}
        onClose={() => setOverrideTarget(null)}
        onConfirm={(payload) => void handleForceOverrideConfirm(payload)}
      />
    </div>
  );
}
