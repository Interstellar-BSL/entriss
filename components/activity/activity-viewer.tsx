"use client";

import { useEffect, useState } from "react";
import {
  Clock3,
  Fingerprint,
  Settings2,
  Shield,
  UserRound,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { ApiError } from "@/lib/api/client";
import {
  listActivity,
  type ActivityCategory,
  type ActivityItem,
  type ListActivityParams,
} from "@/lib/api/activity";
import { cn } from "@/lib/utils/cn";

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  visit: "Visit",
  approval: "Approval",
  identity: "Identity",
  settings: "Settings",
  security: "Security",
  system: "System",
};

const CATEGORY_STYLES: Record<ActivityCategory, string> = {
  visit: "bg-sky-50 text-sky-700 ring-sky-100",
  approval: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  identity: "bg-violet-50 text-violet-700 ring-violet-100",
  settings: "bg-amber-50 text-amber-800 ring-amber-100",
  security: "bg-red-50 text-red-700 ring-red-100",
  system: "bg-[var(--surface-muted)] text-[var(--muted)] ring-[var(--border)]",
};

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  visit: Waypoints,
  approval: Shield,
  identity: Fingerprint,
  settings: Settings2,
  security: Shield,
  system: Clock3,
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function CategoryBadge({ category }: { category: ActivityCategory }) {
  const Icon = CATEGORY_ICONS[category];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        CATEGORY_STYLES[category],
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = CATEGORY_ICONS[item.category];

  return (
    <article className="relative flex gap-3 pb-6 last:pb-0">
      <div className="relative flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
            CATEGORY_STYLES[item.category],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <span className="mt-2 w-px flex-1 bg-[var(--surface-muted)]" aria-hidden />
      </div>

      <div className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted)]">{formatTimestamp(item.occurredAt)}</p>
            <h4 className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              {item.description}
            </h4>
          </div>
          <CategoryBadge category={item.category} />
        </div>

        <dl className="mt-3 space-y-1 text-sm text-[var(--muted)]">
          {item.actorName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Actor</dt>
              <dd className="text-right font-medium text-[var(--foreground)]">
                {item.actorName}
              </dd>
            </div>
          ) : null}
          {item.visitorName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Visitor</dt>
              <dd className="text-right font-medium text-[var(--foreground)]">
                {item.visitorName}
              </dd>
            </div>
          ) : null}
          {item.visitId ? (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Visit</dt>
              <dd className="truncate text-right font-mono text-xs text-[var(--foreground)]">
                {item.visitId}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </article>
  );
}

export function ActivityViewer({
  filters,
  emptyMessage = "No activity recorded yet.",
}: {
  filters: ListActivityParams;
  emptyMessage?: string;
}) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await listActivity(filters);
        if (!cancelled) {
          setItems(result.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load activity stream.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [filterKey, filters]);

  if (loading) {
    return <LoadingState label="Loading activity…" />;
  }

  if (error) {
    return <ErrorState title="Could not load activity" message={error} />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center">
        <UserRound className="mx-auto h-8 w-8 text-[var(--muted)]" aria-hidden />
        <p className="mt-3 text-sm text-[var(--muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/60 px-4 py-4">
      {items.map((item) => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </div>
  );
}
