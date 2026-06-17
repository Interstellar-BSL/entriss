import { apiFetch } from "@/lib/api/client";
import type { NotificationCategory } from "@/lib/notifications/types";

export interface NotificationItem {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  message: string;
  visitId: string | null;
  visitorId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unreadCount: number;
}

export async function listNotifications(params?: {
  unreadOnly?: boolean;
  limit?: number;
  category?: NotificationCategory;
}) {
  return await apiFetch<NotificationListResponse>("/api/v1/notifications", {
    searchParams: {
      unreadOnly: params?.unreadOnly ? "true" : undefined,
      limit: params?.limit,
      category: params?.category,
    },
  });
}

export async function markNotificationRead(id: string) {
  return apiFetch<{ updated: number }>("/api/v1/notifications/read", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export async function markAllNotificationsRead() {
  return apiFetch<{ updated: number }>("/api/v1/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
