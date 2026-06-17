import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { getReceptionDashboard } from "@/lib/services/reception-dashboard.service";

export const GET = withTenant(async (_request, ctx) => {
  const dashboard = await getReceptionDashboard(ctx);
  return success(dashboard);
});
