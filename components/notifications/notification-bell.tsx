"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { BellIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/api/notifications";

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const actionLockRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listNotifications({ limit: 20 });
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleMarkRead = useCallback(async (id: string) => {
    if (actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setActionBusy(true);
    setMarkingId(id);

    try {
      await markNotificationRead(id);
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } finally {
      actionLockRef.current = false;
      setActionBusy(false);
      setMarkingId(null);
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
      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="relative"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-[var(--on-brand)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <NotificationDropdown
          items={items}
          loading={loading}
          actionBusy={actionBusy}
          markingId={markingId}
          onMarkRead={(id) => void handleMarkRead(id)}
          onMarkAllRead={() => void handleMarkAllRead()}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

export function Notifications() {
  return <NotificationBell />;
}
