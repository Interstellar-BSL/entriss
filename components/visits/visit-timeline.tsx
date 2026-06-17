import {
  Ban,
  Camera,
  CheckCircle2,
  Circle,
  Clock3,
  LogIn,
  LogOut,
  Printer,
  ShieldAlert,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { VisitTimelineEntry } from "@/lib/visits/types";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const kindStyles: Record<VisitTimelineEntry["kind"], string> = {
  info: "bg-blue-50 text-[var(--link)] ring-blue-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-800 ring-amber-100",
  muted: "bg-[var(--surface-muted)] text-[var(--muted)] ring-[var(--border)]",
};

function resolveTimelineIcon(label: string): LucideIcon {
  const normalized = label.toLowerCase();

  if (normalized.includes("created")) {
    return UserPlus;
  }
  if (normalized.includes("approved")) {
    return CheckCircle2;
  }
  if (normalized.includes("rejected")) {
    return XCircle;
  }
  if (normalized.includes("forced check-in") || normalized.includes("forced check-out")) {
    return ShieldAlert;
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
  if (normalized.includes("approval requested") || normalized.includes("requested")) {
    return Clock3;
  }

  return Circle;
}

export function VisitTimeline({
  entries,
  order = "asc",
  emptyMessage = "No timeline events yet.",
}: {
  entries: VisitTimelineEntry[];
  order?: "asc" | "desc";
  emptyMessage?: string;
}) {
  const sorted = [...entries].sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return order === "desc" ? bTime - aTime : aTime - bTime;
  });

  if (sorted.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }

  return (
    <ol className="space-y-0">
      {sorted.map((entry, index) => {
        const Icon = resolveTimelineIcon(entry.label);

        return (
          <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < sorted.length - 1 ? (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-[var(--surface-muted)]"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                kindStyles[entry.kind],
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">{entry.label}</p>
                    {entry.isOverride ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">
                        Override
                      </span>
                    ) : null}
                  </div>
                </div>
                <time className="shrink-0 text-xs text-[var(--muted)]">
                  {formatTimestamp(entry.timestamp)}
                </time>
              </div>
              {entry.detail ? (
                <p className="mt-0.5 text-xs text-[var(--muted)]">{entry.detail}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
