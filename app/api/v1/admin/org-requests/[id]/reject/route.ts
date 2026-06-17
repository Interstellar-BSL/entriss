import { withPlatformAdminParams } from "@/lib/api/with-platform-admin";
import { success, handleApiError } from "@/lib/api/response";
import { rejectOrganizationRequest } from "@/lib/services/organization-request-approval.service";
import { rejectOrganizationRequestSchema } from "@/lib/validations/organization-request";

export const POST = withPlatformAdminParams<{ id: string }>(
  async (request, admin, params) => {
    try {
      const body = await request.json();
      const input = rejectOrganizationRequestSchema.parse(body);
      const result = await rejectOrganizationRequest(
        params.id,
        admin.userId,
        input.reason,
      );
      return success({ id: result.id, status: result.status });
    } catch (err) {
      return handleApiError(err);
    }
  },
);
