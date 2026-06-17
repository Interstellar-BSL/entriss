import { withTenantParams } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { forceVisitCheckOut } from "@/lib/services/visit-override.service";
import { forceVisitOverrideSchema } from "@/lib/validations/visit";

export const POST = withTenantParams<{ visitId: string }>(
  async (request, ctx, { visitId }) => {
    const body = await request.json().catch(() => ({}));
    const input = forceVisitOverrideSchema.parse(body);
    const visit = await forceVisitCheckOut(ctx, visitId, input);
    return success({ visit });
  },
);
