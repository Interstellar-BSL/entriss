import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { createVisit, listVisitsByOrganization } from "@/lib/services/visit.service";
import { registerWalkInVisit } from "@/lib/visits/visit-engine";
import {
  createVisitRequestSchema,
  parseListVisitsQuery,
  registerVisitRequestSchema,
} from "@/lib/validations/api";

export const GET = withTenant(async (request, ctx) => {
  const query = parseListVisitsQuery(new URL(request.url));
  const result = await listVisitsByOrganization(ctx, query);

  return success(result);
});

export const POST = withTenant(async (request, ctx) => {
  const body = await request.json();

  if (body.visit && (body.visitor || body.visitorId)) {
    const input = registerVisitRequestSchema.parse(body);
    const result = await registerWalkInVisit(ctx, input);

    return success(
      {
        visitor: result.visitor,
        visit: result.visit,
        visitorCreated: result.visitorCreated,
      },
      201,
    );
  }

  const input = createVisitRequestSchema.parse(body);
  const visit = await createVisit(ctx, input);

  return success({ visit }, 201);
});
