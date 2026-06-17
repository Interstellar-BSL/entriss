import { withTenantParams } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { rejectVisit } from "@/lib/visits/visit-engine";
import { approvalActionSchema } from "@/lib/validations/approval";

export const POST = withTenantParams<{ visitId: string }>(
  async (request, ctx, { visitId }) => {
    const body = await request.json().catch(() => ({}));
    const input = approvalActionSchema.parse(body);
    const visit = await rejectVisit(ctx, visitId, input.notes);
    return success({ visit });
  },
);
