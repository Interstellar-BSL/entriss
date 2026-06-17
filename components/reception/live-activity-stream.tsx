"use client";

import {
  Ban,
  Camera,
  CheckCircle2,
  Circle,
  Clock3,
  LogIn,
  LogOut,
  Printer,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { memo } from "react";

import {
  receptionRowButton,
  receptionSectionLabel,
} from "@/components/reception/reception-ui";
import { cn } from "@/lib/utils/cn";
import type { LiveActivityFeedEntry } from "@/lib/reception/live-activity-feed";

function formatFeedTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function resolveFeedIcon(label: string): LucideIcon {
  const normalized = label.toLowerCase();

  if (normalized.includes("created")) {
    return UserPlus;
  }
  if (normalized.includes("approval requested")) {
    return Clock3;
  }
  if (normalized.includes("approved")) {
    return CheckCircle2;
  }
  if (normalized.includes("rejected")) {
    return XCircle;
  }
  if (normalized.includes("checked in")) {
    return LogIn;
  }
  if (normalized.includes("checked out")) {
    return LogOut;
  }
  if (normalized.includes("cancelled")) {
    return Ban;
  }
  if (normalized.includes("capture") || normalized.includes("photo")) {
    return Camera;
  }
  if (normalized.includes("badge")) {
    return Printer;
  }

  return Circle;
}

const kindStyles = {
  info: "text-[var(--link)] bg-blue-50",
  success: "text-emerald-700 bg-emerald-50",
  warning: "text-amber-800 bg-amber-50",
  muted: "text-[var(--muted)] bg-[var(--surface-muted)]",
} as const;

const LiveActivityStreamRow = memo(function LiveActivityStreamRow({
  entry,
  onSelect,
}: {
  entry: LiveActivityFeedEntry;
  onSelect: (visitId: string) => void;
}) {
  const Icon = resolveFeedIcon(entry.label);

  return (
    <button
      type="button"
      className={receptionRowButton("gap-2.5")}
      onClick={() => onSelect(entry.visitId)}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          kindStyles[entry.kind],
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium text-[var(--foreground)]">
            {entry.visitorName}
          </span>
          <time className="shrink-0 text-[11px] tabular-nums text-[var(--muted)]">
            {formatFeedTime(entry.timestamp)}
          </time>
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
          {entry.label}
          <span className="text-[var(--muted)]">
            {" · "}
            {entry.branchName}
          </span>
        </span>
      </span>
    </button>
  );
});

export const LiveActivityStream = memo(function LiveActivityStream({
  entries,
  loading,
  onSelectVisit,
}: {
  entries: LiveActivityFeedEntry[];
  loading?: boolean;
  onSelectVisit: (visitId: string) => void;
}) {
  if (loading && entries.length === 0) {
    return (
      <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex gap-2.5 px-2 py-2.5">
            <div className="h-7 w-7 animate-pulse rounded-full bg-[var(--surface-muted)]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 animate-pulse rounded bg-[var(--surface-muted)]" />
              <div className="h-2.5 w-40 animate-pulse rounded bg-[var(--surface-muted)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-md border border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
        No activity recorded today yet.
      </p>
    );
  }

  return (
    <div>
      <h4 className={cn("mb-2", receptionSectionLabel)}>Activity stream</h4>
      <div className="max-h-64 divide-y divide-[var(--border)] overflow-y-auto rounded-md border border-[var(--border)]">
        {entries.map((entry) => (
          <LiveActivityStreamRow
            key={entry.id}
            entry={entry}
            onSelect={onSelectVisit}
          />
        ))}
      </div>
    </div>
  );
});
