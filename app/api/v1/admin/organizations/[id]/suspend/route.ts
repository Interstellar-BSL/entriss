import { withPlatformAdminParams } from "@/lib/api/with-platform-admin";
import { success, handleApiError } from "@/lib/api/response";
import { suspendOrganization } from "@/lib/services/platform-admin.service";

export const POST = withPlatformAdminParams<{ id: string }>(
  async (_request, admin, params) => {
    try {
      const organization = await suspendOrganization(params.id, admin.userId);
      return success({ id: organization.id, status: "SUSPENDED" });
    } catch (err) {
      return handleApiError(err);
    }
  },
);
