import { withTenantParams } from "@/lib/api/with-tenant";
import { success, handleApiError } from "@/lib/api/response";
import { disableOrganizationMember } from "@/lib/services/member.service";

export const POST = withTenantParams<{ memberId: string }>(
  async (_request, ctx, params) => {
    try {
      const result = await disableOrganizationMember(ctx, params.memberId);
      return success(result);
    } catch (err) {
      return handleApiError(err);
    }
  },
);
