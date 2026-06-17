import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { markNotificationRead } from "@/lib/services/notification.service";

export const POST = withTenant(async (request, ctx) => {
  const body = (await request.json()) as { id?: string };

  if (!body.id) {
    return success({ updated: 0 });
  }

  const result = await markNotificationRead(ctx, body.id);
  return success({ updated: result.count });
});
