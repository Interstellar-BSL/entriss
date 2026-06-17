import { success } from "@/lib/api/response";
import { withTenant } from "@/lib/api/with-tenant";
import { getAuditAnalytics } from "@/lib/services/analytics-audit.service";
import { parseAnalyticsQuery } from "@/lib/validations/api";

export const GET = withTenant(async (request, ctx) => {
  const query = parseAnalyticsQuery(new URL(request.url));
  const result = await getAuditAnalytics(ctx, query);
  return success(result);
});
