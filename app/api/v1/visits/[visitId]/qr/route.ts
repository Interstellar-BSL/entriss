import { withTenantParams } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { ensureVisitQR } from "@/lib/services/qr.service";

export const POST = withTenantParams<{ visitId: string }>(
  async (_request, ctx, { visitId }) => {
    const qr = await ensureVisitQR(ctx, visitId);

    return success({
      visitId: qr.visitId,
      token: qr.token,
      expiresAt: qr.expiresAt.toISOString(),
    });
  },
);
