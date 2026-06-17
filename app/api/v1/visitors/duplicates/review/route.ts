import { success } from "@/lib/api/response";
import { withTenant } from "@/lib/api/with-tenant";
import { markDuplicateGroupReviewed } from "@/lib/services/visitor-duplicate.service";
import { markDuplicateReviewedSchema } from "@/lib/validations/api";

export const POST = withTenant(async (request, ctx) => {
  const body = await request.json().catch(() => ({}));
  const input = markDuplicateReviewedSchema.parse(body);
  await markDuplicateGroupReviewed(ctx, input);
  return success({ reviewed: true });
});
