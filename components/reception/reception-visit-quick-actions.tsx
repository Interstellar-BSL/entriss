"use client";

import {
  BadgeCheck,
  FileText,
  LogIn,
  LogOut,
  Printer,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { receptionCompactButton } from "@/components/reception/reception-ui";
import { Button } from "@/components/ui/button";
import { VisitStatus } from "@prisma/client";
import {
  canCheckInVisit,
  canCheckOutVisit,
  canForceCheckInVisit,
  canForceCheckOutVisit,
  canPrintVisitBadge,
} from "@/lib/visits/actions";
import { cn } from "@/lib/utils/cn";

export interface ReceptionVisitQuickActionsProps {
  visitId: string;
  visitorId: string;
  status: VisitStatus | string;
  busy?: boolean;
  compact?: boolean;
  canForceCheckIn?: boolean;
  canForceCheckOut?: boolean;
  onCheckIn: (visitId: string) => void;
  onCheckOut: (visitId: string) => void;
  onPrintBadge: (visitId: string) => void;
  onOpenVisitor360: (visitorId: string) => void;
  onOpenVisitDetails: (
    visitId: string,
    tab?: "overview" | "approval" | "checkin",
  ) => void;
  onForceCheckIn?: (visitId: string) => void;
  onForceCheckOut?: (visitId: string) => void;
}

export function ReceptionVisitQuickActions({
  visitId,
  visitorId,
  status,
  busy = false,
  compact = false,
  canForceCheckIn = false,
  canForceCheckOut = false,
  onCheckIn,
  onCheckOut,
  onPrintBadge,
  onOpenVisitor360,
  onOpenVisitDetails,
  onForceCheckIn,
  onForceCheckOut,
}: ReceptionVisitQuickActionsProps) {
  const canCheckIn = canCheckInVisit(status);
  const canCheckOut = canCheckOutVisit(status);
  const canPrint = canPrintVisitBadge(status);
  const showForceCheckIn =
    canForceCheckIn && canForceCheckInVisit(status) && onForceCheckIn;
  const showForceCheckOut =
    canForceCheckOut && canForceCheckOutVisit(status) && onForceCheckOut;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1",
        compact ? "justify-end" : "mt-2",
      )}
      onClick={(event) => event.stopPropagation()}
    >
      {canCheckIn ? (
        <Button
          type="button"
          size="sm"
          className={receptionCompactButton}
          disabled={busy}
          onClick={() => onCheckIn(visitId)}
        >
          <LogIn className="mr-1 h-3.5 w-3.5" />
          Check in
        </Button>
      ) : null}
      {showForceCheckIn ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cn(receptionCompactButton, "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100")}
          disabled={busy}
          onClick={() => onForceCheckIn(visitId)}
        >
          <ShieldAlert className="mr-1 h-3.5 w-3.5" />
          Force check-in
        </Button>
      ) : null}
      {canCheckOut ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={receptionCompactButton}
          disabled={busy}
          onClick={() => onCheckOut(visitId)}
        >
          <LogOut className="mr-1 h-3.5 w-3.5" />
          Check out
        </Button>
      ) : null}
      {showForceCheckOut ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cn(receptionCompactButton, "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100")}
          disabled={busy}
          onClick={() => onForceCheckOut(visitId)}
        >
          <ShieldAlert className="mr-1 h-3.5 w-3.5" />
          Force check-out
        </Button>
      ) : null}
      {canPrint ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={receptionCompactButton}
          disabled={busy}
          onClick={() => onPrintBadge(visitId)}
        >
          <Printer className="mr-1 h-3.5 w-3.5" />
          Badge
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={receptionCompactButton}
        disabled={busy}
        onClick={() => onOpenVisitor360(visitorId)}
      >
        <UserRound className="mr-1 h-3.5 w-3.5" />
        360
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={receptionCompactButton}
        disabled={busy}
        onClick={() => onOpenVisitDetails(visitId, "overview")}
      >
        <FileText className="mr-1 h-3.5 w-3.5" />
        Visit
      </Button>
    </div>
  );
}

export function ReceptionApprovalQuickActions({
  visitId,
  visitorId,
  approvalKind,
  busy = false,
  canForceCheckIn = false,
  onOpenApproval,
  onOpenVisitor360,
  onOpenVisitDetails,
  onForceCheckIn,
}: {
  visitId: string;
  visitorId: string;
  approvalKind: "PENDING" | "APPROVAL_REQUIRED";
  busy?: boolean;
  canForceCheckIn?: boolean;
  onOpenApproval: (visitId: string) => void;
  onOpenVisitor360: (visitorId: string) => void;
  onOpenVisitDetails: (visitId: string) => void;
  onForceCheckIn?: (visitId: string) => void;
}) {
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        size="sm"
        className={receptionCompactButton}
        disabled={busy}
        onClick={() => onOpenApproval(visitId)}
      >
        <BadgeCheck className="mr-1 h-3.5 w-3.5" />
        {approvalKind === "PENDING" ? "Open approval" : "Approve check-in"}
      </Button>
      {canForceCheckIn && onForceCheckIn ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cn(receptionCompactButton, "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100")}
          disabled={busy}
          onClick={() => onForceCheckIn(visitId)}
        >
          <ShieldAlert className="mr-1 h-3.5 w-3.5" />
          Force check-in
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={receptionCompactButton}
        disabled={busy}
        onClick={() => onOpenVisitor360(visitorId)}
      >
        <UserRound className="mr-1 h-3.5 w-3.5" />
        360
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={receptionCompactButton}
        disabled={busy}
        onClick={() => onOpenVisitDetails(visitId)}
      >
        <FileText className="mr-1 h-3.5 w-3.5" />
        Visit
      </Button>
    </div>
  );
}
