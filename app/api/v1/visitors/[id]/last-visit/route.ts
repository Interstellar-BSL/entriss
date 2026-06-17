import { withTenantParams } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { getLastVisit } from "@/lib/services/visitor-last-visit.service";

export const GET = withTenantParams<{ id: string }>(
  async (_request, ctx, { id }) => {
    const lastVisit = await getLastVisit(ctx, id);
    return success({ lastVisit });
  },
);
