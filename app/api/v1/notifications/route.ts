import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import {
  countUnreadNotifications,
  listInAppNotifications,
} from "@/lib/services/notification.service";
import type { NotificationCategory } from "@/lib/notifications/types";

export const GET = withTenant(async (request, ctx) => {
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Number(searchParams.get("limit") ?? 20);
  const category = searchParams.get("category") as NotificationCategory | null;

  const [items, unreadCount] = await Promise.all([
    listInAppNotifications(ctx, {
      unreadOnly,
      limit,
      category: category ?? undefined,
    }),
    countUnreadNotifications(ctx),
  ]);

  return success({ items, unreadCount });
});
