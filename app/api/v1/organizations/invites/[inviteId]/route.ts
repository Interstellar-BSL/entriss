import { success, handleApiError } from "@/lib/api/response";
import { withTenantParams } from "@/lib/api/with-tenant";
import { revokeOrganizationInvite } from "@/lib/services/invite.service";

export const DELETE = withTenantParams<{ inviteId: string }>(
  async (_request, ctx, params) => {
    try {
      await revokeOrganizationInvite(ctx, params.inviteId);
      return success({ revoked: true });
    } catch (err) {
      return handleApiError(err);
    }
  },
);
