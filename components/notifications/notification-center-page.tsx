"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/api/notifications";
import type { NotificationCategory } from "@/lib/notifications/types";
import { cn } from "@/lib/utils/cn";

const FILTERS: Array<{ id: "all" | NotificationCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "arrivals", label: "Arrivals" },
  { id: "approvals", label: "Approvals" },
  { id: "system", label: "System" },
];

export function NotificationCenterPage() {
  const [filter, setFilter] = useState<"all" | NotificationCategory>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const actionLockRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNotifications({
        limit: 100,
        category: filter === "all" ? undefined : filter,
      });
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = useCallback(async (id: string) => {
    if (actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setActionBusy(true);

    try {
      await markNotificationRead(id);
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    if (actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setActionBusy(true);

    try {
      await markAllNotificationsRead();
      await load();
    } finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  }, [load]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Notifications
          </h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={actionBusy}
          disabled={actionBusy || unreadCount === 0}
          onClick={() => void handleMarkAllRead()}
        >
          Mark all read
        </Button>
      </header>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "secondary" : "ghost"}
            className="h-8 text-xs"
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification history</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)] p-0">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              No notifications in this filter
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={actionBusy}
                className={cn(
                  "flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-[var(--surface-muted)] disabled:cursor-wait disabled:opacity-60",
                  !item.readAt && "bg-[var(--surface-muted)]/60",
                )}
                onClick={() => {
                  if (!item.readAt && !actionBusy) {
                    void handleMarkRead(item.id);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
                  <span className="shrink-0 text-xs text-[var(--muted)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)]">{item.message}</p>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
