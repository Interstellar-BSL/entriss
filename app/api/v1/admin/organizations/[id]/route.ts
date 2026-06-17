import { withPlatformAdminParams } from "@/lib/api/with-platform-admin";
import { success, handleApiError } from "@/lib/api/response";
import { getPlatformOrganizationDetail } from "@/lib/services/platform-admin.service";

export const GET = withPlatformAdminParams<{ id: string }>(
  async (_request, _admin, params) => {
    try {
      const organization = await getPlatformOrganizationDetail(params.id);
      return success(organization);
    } catch (err) {
      return handleApiError(err);
    }
  },
);
