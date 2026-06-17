import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { getApprovalQueue } from "@/lib/visits/visit-engine";
import { approvalQueueTabSchema } from "@/lib/validations/approval";

export const GET = withTenant(async (request, ctx) => {
  const { searchParams } = new URL(request.url);
  const tab = approvalQueueTabSchema.parse(
    searchParams.get("tab") ?? "pending",
  );
  const limit = Number(searchParams.get("limit") ?? 25);
  const offset = Number(searchParams.get("offset") ?? 0);

  const result = await getApprovalQueue(ctx, tab, { limit, offset });
  return success(result);
});
