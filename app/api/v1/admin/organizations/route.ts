import { withPlatformAdmin } from "@/lib/api/with-platform-admin";
import { success } from "@/lib/api/response";
import { listPlatformOrganizations } from "@/lib/services/platform-admin.service";

export const GET = withPlatformAdmin(async () => {
  const result = await listPlatformOrganizations();
  return success(result);
});