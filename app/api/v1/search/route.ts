import { success } from "@/lib/api/response";
import { withTenant } from "@/lib/api/with-tenant";
import { searchUnified } from "@/lib/services/unified-search.service";
import { parseUnifiedSearchQuery } from "@/lib/validations/api";

export const GET = withTenant(async (request, ctx) => {
  const { q } = parseUnifiedSearchQuery(new URL(request.url));
  const result = await searchUnified(ctx, q ?? "");

  return success(result);
});
