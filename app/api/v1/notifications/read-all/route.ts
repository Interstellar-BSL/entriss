import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { markAllNotificationsRead } from "@/lib/services/notification.service";

export const POST = withTenant(async (_request, ctx) => {
  const result = await markAllNotificationsRead(ctx);
  return success({ updated: result.count });
});
