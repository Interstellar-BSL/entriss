import { withPlatformAdminParams } from "@/lib/api/with-platform-admin";
import { success, handleApiError } from "@/lib/api/response";
import { reactivateOrganization } from "@/lib/services/platform-admin.service";

export const POST = withPlatformAdminParams<{ id: string }>(
  async (_request, admin, params) => {
    try {
      const organization = await reactivateOrganization(params.id, admin.userId);
      return success({ id: organization.id, status: "APPROVED" });
    } catch (err) {
      return handleApiError(err);
    }
  },
);
