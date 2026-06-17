import QRCode from "qrcode";

import { ensureVisitQR } from "@/lib/services/qr.service";
import type { TenantContext } from "@/lib/tenant/tenant-context";

export interface VisitQRCodeEmailPayload {
  qrImage: string;
  qrToken: string;
  expiry: string;
}

/**
 * Builds a signed QR token and base64 data-URL image for visitor emails.
 */
export async function generateVisitQRCodeEmailPayload(
  ctx: TenantContext,
  visitId: string,
): Promise<VisitQRCodeEmailPayload> {
  const qr = await ensureVisitQR(ctx, visitId);
  const qrImage = await QRCode.toDataURL(qr.token, {
    width: 256,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return {
    qrImage,
    qrToken: qr.token,
    expiry: qr.expiresAt.toISOString(),
  };
}
