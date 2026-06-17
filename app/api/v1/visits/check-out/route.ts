import { processCheckOut } from "@/lib/api/check-in-out";
import { withTenant } from "@/lib/api/with-tenant";
import { getRequestMeta, success } from "@/lib/api/response";
import { checkOutRequestSchema } from "@/lib/validations/api";

export const POST = withTenant(async (request, ctx) => {
  const body = await request.json();
  const input = checkOutRequestSchema.parse(body);
  const meta = getRequestMeta(request);

  const result = await processCheckOut(ctx, input, meta);

  return success({
    visit: result.visit,
    method: input.qrToken ? "qr" : "visitId",
  });
});
