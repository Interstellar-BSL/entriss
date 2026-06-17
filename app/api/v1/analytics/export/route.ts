import { success } from "@/lib/api/response";
import { withTenant } from "@/lib/api/with-tenant";
import { getAnalyticsExportPayload } from "@/lib/services/analytics-export.service";
import { parseAnalyticsQuery } from "@/lib/validations/api";

export const GET = withTenant(async (request, ctx) => {
  const query = parseAnalyticsQuery(new URL(request.url));
  const result = await getAnalyticsExportPayload(ctx, query);
  return success(result);
});
