"use client";

import { useEffect, useState } from "react";
import {
  Clock3,
  Fingerprint,
  Settings2,
  Shield,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import {
  listActivity,
  type ActivityCategory,
  type ActivityItem,
} from "@/lib/api/activity";
import { toUserFacingErrorMessage } from "@/lib/api/user-facing-errors";
import { cn } from "@/lib/utils/cn";

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  visit: "Visit",
  approval: "Approval",
  identity: "Identity",
  settings: "Settings",
  security: "Security",
  system: "System",
};

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  visit: Waypoints,
  approval: Shield,
  identity: Fingerprint,
  settings: Settings2,
  security: Shield,
  system: Clock3,
};

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function eventLabel(item: ActivityItem) {
  const action = item.action.replace(/[._]/g, " ");
  if (item.category === "approval") {
    return action.includes("reject") ? "Rejected" : "Approved";
  }
  if (item.category === "security") {
    return "Override";
  }
  if (action.includes("check in") || action.includes("checked in")) {
    return "Check in";
  }
  if (action.includes("check out") || action.includes("checked out")) {
    return "Check out";
  }

  return CATEGORY_LABELS[item.category];
}

function personLabel(item: ActivityItem) {
  return item.visitorName ?? item.actorName ?? "System";
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const Icon = CATEGORY_ICONS[item.category];

  return (
    <article
      className={cn(
        "w-[11.5rem] shrink-0 snap-start rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm",
        "flex flex-col gap-2",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {eventLabel(item)}
        </span>
        <Icon className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
      </div>
      <p className="truncate text-sm font-medium text-[var(--foreground)]">{personLabel(item)}</p>
      <p className="text-xs text-[var(--muted)]">{formatRelativeTime(item.occurredAt)}</p>
    </article>
  );
}

export function DashboardRecentActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listActivity({ limit: 20 })
      .then((result) => {
        if (!cancelled) {
          setItems(result.items);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(toUserFacingErrorMessage(err, "Could not load recent activity."));
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <LoadingState variant="list" label="Loading activity…" />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No recent activity yet.</p>
        ) : (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory">
            {items.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
