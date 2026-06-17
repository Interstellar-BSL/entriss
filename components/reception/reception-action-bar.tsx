"use client";

import Link from "next/link";
import {
  ClipboardList,
  Printer,
  QrCode,
  Search,
  UserPlus,
} from "lucide-react";
import { memo } from "react";

import { receptionCompactButton } from "@/components/reception/reception-ui";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils/cn";

export const ReceptionActionBar = memo(function ReceptionActionBar({
  permissions,
  pendingApprovals,
  canPrintBadge,
  onScanQr,
  onSearch,
  onPendingApprovals,
  onPrintBadge,
}: {
  permissions: string[];
  pendingApprovals: number;
  canPrintBadge: boolean;
  onScanQr: () => void;
  onSearch: () => void;
  onPendingApprovals: () => void;
  onPrintBadge: () => void;
}) {
  const canCheckIn = permissions.includes(PERMISSIONS.VISIT_CHECK_IN);
  const canCreateVisitor = permissions.includes(PERMISSIONS.VISITOR_CREATE);
  const canReadVisitors = permissions.includes(PERMISSIONS.VISITOR_READ);
  const canApprove =
    permissions.includes(PERMISSIONS.VISIT_APPROVE_PRE_VISIT) ||
    permissions.includes(PERMISSIONS.VISIT_APPROVE_CHECKIN) ||
    permissions.includes(PERMISSIONS.VISIT_APPROVE);

  const actions = [
    canCheckIn
      ? {
          id: "scan",
          label: "Scan QR",
          icon: QrCode,
          onClick: onScanQr,
        }
      : null,
    canCreateVisitor
      ? {
          id: "walkin",
          label: "New walk-in",
          icon: UserPlus,
          href: "/kiosk",
        }
      : null,
    canReadVisitors
      ? {
          id: "search",
          label: "Search",
          icon: Search,
          onClick: onSearch,
        }
      : null,
    canApprove
      ? {
          id: "approvals",
          label: "Pending approvals",
          icon: ClipboardList,
          onClick: onPendingApprovals,
          badge: pendingApprovals > 0 ? pendingApprovals : undefined,
        }
      : null,
    canPrintBadge
      ? {
          id: "badge",
          label: "Print badge",
          icon: Printer,
          onClick: onPrintBadge,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick?: () => void;
    href?: string;
    badge?: number;
  }>;

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm">
      {actions.map((action) => {
        const Icon = action.icon;
        const content = (
          <>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{action.label}</span>
            {action.badge !== undefined ? (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-900">
                {action.badge}
              </span>
            ) : null}
          </>
        );

        if (action.href) {
          return (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                receptionCompactButton,
                "inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-muted)]",
              )}
            >
              {content}
            </Link>
          );
        }

        return (
          <Button
            key={action.id}
            type="button"
            variant="secondary"
            size="sm"
            className={cn(receptionCompactButton, "gap-1.5")}
            onClick={action.onClick}
          >
            {content}
          </Button>
        );
      })}
    </div>
  );
});
