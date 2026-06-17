import { withTenantParams } from "@/lib/api/with-tenant";
import { success, handleApiError } from "@/lib/api/response";
import { updateOrganizationMember } from "@/lib/services/member.service";
import { updateOrganizationMemberSchema } from "@/lib/validations/member";

export const PATCH = withTenantParams<{ memberId: string }>(
  async (request, ctx, params) => {
    try {
      const body = await request.json();
      const input = updateOrganizationMemberSchema.parse(body);
      const result = await updateOrganizationMember(ctx, params.memberId, input);
      return success(result);
    } catch (err) {
      return handleApiError(err);
    }
  },
);
