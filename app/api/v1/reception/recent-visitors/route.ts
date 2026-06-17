import { success } from "@/lib/api/response";
import { withTenant } from "@/lib/api/with-tenant";
import { getRecentVisitors } from "@/lib/services/recent-visitors.service";

export const GET = withTenant(async (_request, ctx) => {
  const visitors = await getRecentVisitors(ctx);
  return success({ visitors });
});
