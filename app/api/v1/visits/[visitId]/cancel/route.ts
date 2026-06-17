import { withTenantParams } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { cancelVisit } from "@/lib/services/visit.service";
import { updateVisitStatusSchema } from "@/lib/validations/visit";

export const POST = withTenantParams<{ visitId: string }>(
  async (request, ctx, { visitId }) => {
    const body = await request.json().catch(() => ({}));
    const input = updateVisitStatusSchema.parse({
      status: "CANCELLED",
      cancelReason: body.cancelReason ?? "Cancelled at reception",
      notes: body.notes,
    });
    const visit = await cancelVisit(ctx, visitId, input.cancelReason!);
    return success({ visit });
  },
);
