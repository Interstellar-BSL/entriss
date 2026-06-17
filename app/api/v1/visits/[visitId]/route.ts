import { withTenantParams } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { getVisitDetailById } from "@/lib/services/visit.service";

export const GET = withTenantParams<{ visitId: string }>(
  async (_request, ctx, { visitId }) => {
    const visit = await getVisitDetailById(ctx, visitId);
    return success({ visit });
  },
);
