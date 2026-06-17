import { success } from "@/lib/api/response";
import { withTenantParams } from "@/lib/api/with-tenant";
import { getVisitorInsights } from "@/lib/services/visitor-insights.service";

export const GET = withTenantParams<{ id: string }>(
  async (_request, ctx, { id }) => {
    const result = await getVisitorInsights(ctx, id);
    return success(result);
  },
);
