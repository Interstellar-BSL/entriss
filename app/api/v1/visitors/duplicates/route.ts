import { success } from "@/lib/api/response";
import { withTenant } from "@/lib/api/with-tenant";
import { getPossibleDuplicates } from "@/lib/services/visitor-duplicate.service";
import { parseDuplicateVisitorsQuery } from "@/lib/validations/api";

export const GET = withTenant(async (request, ctx) => {
  const query = parseDuplicateVisitorsQuery(new URL(request.url));
  const duplicates = await getPossibleDuplicates(ctx, {
    confidence: query.confidence,
    limit: query.limit,
  });

  return success({ duplicates });
});
