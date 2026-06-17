import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { getActivityStream } from "@/lib/services/activity-stream.service";
import { parseListActivityQuery } from "@/lib/validations/api";

export const GET = withTenant(async (request, ctx) => {
  const query = parseListActivityQuery(new URL(request.url));
  const result = await getActivityStream(ctx, query);

  return success(result);
});
