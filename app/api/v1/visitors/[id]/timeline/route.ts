import { success } from "@/lib/api/response";
import { withTenantParams } from "@/lib/api/with-tenant";
import { getVisitorTimeline } from "@/lib/services/visitor-timeline.service";

export const GET = withTenantParams<{ id: string }>(
  async (_request, ctx, { id }) => {
    const timeline = await getVisitorTimeline(ctx, id);
    return success(timeline);
  },
);
