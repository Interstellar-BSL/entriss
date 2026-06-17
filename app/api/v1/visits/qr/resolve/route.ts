import { withTenant } from "@/lib/api/with-tenant";
import { getRequestMeta, success } from "@/lib/api/response";
import { resolveVisitFromQrScan } from "@/lib/services/visit.service";
import { resolveVisitQrRequestSchema } from "@/lib/validations/api";

export const POST = withTenant(async (request, ctx) => {
  const body = await request.json();
  const input = resolveVisitQrRequestSchema.parse(body);
  const meta = getRequestMeta(request);

  const result = await resolveVisitFromQrScan(ctx, input.qrToken, meta);

  return success({
    visit: result.visit,
    qr: {
      valid: result.qr.valid,
      expiringSoon: result.qr.expiringSoon,
      expiresAt: result.qr.expiresAt.toISOString(),
    },
  });
});
