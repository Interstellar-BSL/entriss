import { enforceApiRateLimit } from "@/lib/api/rate-limit";
import { withTenant } from "@/lib/api/with-tenant";
import { getRequestMeta, success } from "@/lib/api/response";
import { findVisitByVisitorDetails } from "@/lib/services/visit.service";
import { findVisitByVisitorDetailsSchema } from "@/lib/validations/operations";

const SEARCH_RATE_LIMIT = { max: 20, windowMs: 60_000 };

export const POST = withTenant(async (request, ctx) => {
  const meta = getRequestMeta(request);

  enforceApiRateLimit(
    "visit-search",
    `${ctx.organizationId}:${ctx.userId}:${meta.ipAddress}`,
    SEARCH_RATE_LIMIT.max,
    SEARCH_RATE_LIMIT.windowMs,
  );

  const body = await request.json();
  const criteria = findVisitByVisitorDetailsSchema.parse(body);
  const visits = await findVisitByVisitorDetails(ctx, criteria);

  return success({ visits });
});
