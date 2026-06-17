import { withPlatformAdminParams } from "@/lib/api/with-platform-admin";
import { success, handleApiError } from "@/lib/api/response";
import { approveOrganizationRequest } from "@/lib/services/organization-request-approval.service";
import { approveOrganizationRequestSchema } from "@/lib/validations/organization-request";

export const POST = withPlatformAdminParams<{ id: string }>(
  async (request, admin, params) => {
    try {
      const body = await request.json().catch(() => ({}));
      const input = approveOrganizationRequestSchema.parse(body);
      const result = await approveOrganizationRequest(
        params.id,
        admin.userId,
        input.notes,
      );
      return success(result);
    } catch (err) {
      return handleApiError(err);
    }
  },
);
