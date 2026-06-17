import { withPlatformAdmin } from "@/lib/api/with-platform-admin";
import { success } from "@/lib/api/response";
import { getPlatformDashboardMetrics } from "@/lib/services/platform-admin.service";

export const GET = withPlatformAdmin(async () => {
  const metrics = await getPlatformDashboardMetrics();
  return success(metrics);
});
