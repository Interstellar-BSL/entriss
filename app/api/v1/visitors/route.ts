import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import {
  createVisitorForStaff,
  listVisitors,
} from "@/lib/services/visitor.service";
import {
  createVisitorRequestSchema,
  parseListVisitorsQuery,
} from "@/lib/validations/api";

export const GET = withTenant(async (request, ctx) => {
  const query = parseListVisitorsQuery(new URL(request.url));
  const result = await listVisitors(ctx, query);

  return success(result);
});

export const POST = withTenant(async (request, ctx) => {
  const body = await request.json();
  const input = createVisitorRequestSchema.parse(body);
  const result = await createVisitorForStaff(ctx, input);

  return success(
    {
      visitor: result.visitor,
      created: result.created,
    },
    201,
  );
});
