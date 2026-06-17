import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { resolveVisitorIdentity } from "@/lib/services/visitor.service";
import { parseResolveVisitorIdentityQuery } from "@/lib/validations/api";

export const GET = withTenant(async (request, ctx) => {
  const criteria = parseResolveVisitorIdentityQuery(new URL(request.url));
  const result = await resolveVisitorIdentity(ctx, criteria);

  return success({
    visitor: result.visitor,
    visitSummary: result.visitSummary
      ? {
          visitCount: result.visitSummary.visitCount,
          lastVisitAt: result.visitSummary.lastVisitAt?.toISOString() ?? null,
        }
      : null,
  });
});
