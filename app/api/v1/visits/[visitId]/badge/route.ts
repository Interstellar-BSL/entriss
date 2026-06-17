import { withTenantParams } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import {
  generateA4BadgeLayout,
  generateBadgeData,
} from "@/lib/services/badge.service";

export const GET = withTenantParams<{ visitId: string }>(
  async (request, ctx, { visitId }) => {
    const format = new URL(request.url).searchParams.get("format");

    if (format === "a4") {
      const layout = await generateA4BadgeLayout(ctx, visitId);
      return success(layout);
    }

    const badge = await generateBadgeData(ctx, visitId);
    return success(badge);
  },
);
