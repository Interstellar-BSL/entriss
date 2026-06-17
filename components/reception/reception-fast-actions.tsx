"use client";

import {
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  Printer,
  Search,
  UserCheck,
} from "lucide-react";
import { memo } from "react";

import {
  receptionCard,
  receptionCardBody,
  receptionCardHeader,
  receptionCardSubtitle,
  receptionCardTitle,
  receptionCompactButton,
} from "@/components/reception/reception-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface FastAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
}

export const ReceptionFastActions = memo(function ReceptionFastActions({
  pendingApprovals,
  hasSelectedVisit,
  canCheckInSelected,
  canPrintBadgeSelected,
  onFocusSearch,
  onShowTodayArrivals,
  onOpenApprovals,
  onOpenSelectedVisit,
  onCheckInSelected,
  onPrintBadgeSelected,
}: {
  pendingApprovals: number;
  hasSelectedVisit: boolean;
  canCheckInSelected: boolean;
  canPrintBadgeSelected: boolean;
  onFocusSearch: () => void;
  onShowTodayArrivals: () => void;
  onOpenApprovals: () => void;
  onOpenSelectedVisit: () => void;
  onCheckInSelected: () => void;
  onPrintBadgeSelected: () => void;
}) {
  const actions: FastAction[] = [
    {
      id: "search",
      label: "Search visitor",
      description: "Find by name, email, or phone",
      icon: Search,
      onClick: onFocusSearch,
    },
    {
      id: "today",
      label: "Today's arrivals",
      description: "View visits scheduled for today",
      icon: CalendarDays,
      onClick: onShowTodayArrivals,
    },
    {
      id: "approvals",
      label: "Approval queue",
      description:
        pendingApprovals > 0
          ? `${pendingApprovals} pending`
          : "No pending approvals",
      icon: ClipboardList,
      onClick: onOpenApprovals,
    },
    {
      id: "details",
      label: "Visit details",
      description: hasSelectedVisit
        ? "Open selected visit drawer"
        : "Select a visit below",
      icon: BadgeCheck,
      onClick: onOpenSelectedVisit,
      disabled: !hasSelectedVisit,
    },
    {
      id: "checkin",
      label: "Check in",
      description: canCheckInSelected
        ? "Check in selected visit"
        : "Select an eligible visit",
      icon: UserCheck,
      onClick: onCheckInSelected,
      disabled: !canCheckInSelected,
    },
    {
      id: "badge",
      label: "Print badge",
      description: canPrintBadgeSelected
        ? "Print badge for selected visit"
        : "Select a checked-in visit",
      icon: Printer,
      onClick: onPrintBadgeSelected,
      disabled: !canPrintBadgeSelected,
    },
  ];

  return (
    <section className={receptionCard}>
      <div className={receptionCardHeader}>
        <h2 className={receptionCardTitle}>Fast actions</h2>
        <p className={receptionCardSubtitle}>
          Common reception tasks without leaving this screen
        </p>
      </div>
      <div className={cn(receptionCardBody, "grid gap-2 sm:grid-cols-2 lg:grid-cols-3")}>
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Button
              key={action.id}
              type="button"
              variant={action.id === "checkin" ? "primary" : "secondary"}
              disabled={action.disabled}
              className={cn(
                receptionCompactButton,
                "h-auto min-h-8 justify-start gap-2 px-2.5 py-2 text-left",
              )}
              onClick={action.onClick}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-[var(--foreground)]">
                  {action.label}
                </span>
                <span className="block truncate text-[10px] font-normal text-[var(--muted)]">
                  {action.description}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
});
