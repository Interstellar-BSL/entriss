import { success, handleApiError } from "@/lib/api/response";
import { withTenantParams } from "@/lib/api/with-tenant";
import { revokeOrganizationInvite } from "@/lib/services/invite.service";

export const POST = withTenantParams<{ id: string }>(
  async (_request, ctx, params) => {
    try {
      const result = await revokeOrganizationInvite(ctx, params.id);
      return success(result);
    } catch (err) {
      return handleApiError(err);
    }
  },
);
