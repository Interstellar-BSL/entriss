import { processCheckIn } from "@/lib/api/check-in-out";
import { withTenant } from "@/lib/api/with-tenant";
import { getRequestMeta } from "@/lib/api/response";
import {
  apiSuccess,
  jsonApiSuccess,
} from "@/lib/server/http/api-response";
import { checkInRequestSchema } from "@/lib/validations/api";

export const POST = withTenant(async (request, ctx) => {
  const body = await request.json();
  const input = checkInRequestSchema.parse(body);
  const meta = getRequestMeta(request);

  const result = await processCheckIn(ctx, input, meta);
  const state = result.state;

  return jsonApiSuccess(
    apiSuccess({
      state,
      data: {
        visit: result.visit,
        badge: "badge" in result ? result.badge : undefined,
        method: input.qrToken ? "qr" : "visitId",
        ui: "ui" in result ? result.ui : undefined,
        ...(input.qrToken ? { qr: { valid: true as const } } : {}),
      },
    }),
  );
});
