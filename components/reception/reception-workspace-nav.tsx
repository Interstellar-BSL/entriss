"use client";

import {
  Activity,
  LayoutDashboard,
  Search,
  Wrench,
} from "lucide-react";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type ReceptionWorkspace = "command" | "search" | "operations" | "activity";

const WORKSPACES: Array<{
  id: ReceptionWorkspace;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "command", label: "Command center", shortLabel: "Command", icon: LayoutDashboard },
  { id: "search", label: "Search", shortLabel: "Search", icon: Search },
  { id: "operations", label: "Operations", shortLabel: "Ops", icon: Wrench },
  { id: "activity", label: "Activity", shortLabel: "Activity", icon: Activity },
];

export const ReceptionWorkspaceNav = memo(function ReceptionWorkspaceNav({
  active,
  onChange,
  operationsBadge,
}: {
  active: ReceptionWorkspace;
  onChange: (workspace: ReceptionWorkspace) => void;
  operationsBadge?: number;
}) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-[var(--border)] pb-px"
      aria-label="Reception workspaces"
    >
      {WORKSPACES.map((workspace) => {
        const Icon = workspace.icon;
        const isActive = active === workspace.id;
        const badge =
          workspace.id === "operations" && operationsBadge
            ? operationsBadge
            : undefined;

        return (
          <Button
            key={workspace.id}
            type="button"
            size="sm"
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "h-8 shrink-0 gap-1.5 rounded-b-none text-xs",
              isActive && "border border-b-0 border-[var(--border)] bg-[var(--card)]",
            )}
            onClick={() => onChange(workspace.id)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{workspace.label}</span>
            <span className="sm:hidden">{workspace.shortLabel}</span>
            {badge !== undefined ? (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-900">
                {badge}
              </span>
            ) : null}
          </Button>
        );
      })}
    </nav>
  );
});
