"use client";

import Link from "next/link";

import type { NotificationItem } from "@/lib/api/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return date.toLocaleDateString();
}

export function NotificationDropdown({
  items,
  loading,
  actionBusy = false,
  markingId = null,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: {
  items: NotificationItem[];
  loading?: boolean;
  actionBusy?: boolean;
  markingId?: string | null;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">Notifications</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            loading={actionBusy}
            disabled={actionBusy || items.every((item) => item.readAt)}
            onClick={onMarkAllRead}
          >
            Mark all read
          </Button>
          <Link
            href="/notifications"
            onClick={onClose}
            className="inline-flex h-7 items-center rounded-md px-2 text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            View all
          </Link>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <p className="px-3 py-6 text-center text-xs text-[var(--muted)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-[var(--muted)]">
            No notifications yet
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={actionBusy && markingId === item.id}
              className={cn(
                "flex w-full flex-col gap-0.5 border-b border-[var(--border)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-wait disabled:opacity-60",
                !item.readAt && "bg-[var(--surface-muted)]",
              )}
              onClick={() => {
                if (!item.readAt && !actionBusy) {
                  onMarkRead(item.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-[var(--foreground)]">{item.title}</p>
                <span className="shrink-0 text-[10px] text-[var(--muted)]">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">{item.message}</p>
              <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                {item.category}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
