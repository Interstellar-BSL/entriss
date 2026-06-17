import { QRError } from "@/lib/server/errors/qr.errors";

import {
  decodeVisitQrToken,
  resolvePayloadOrganizationId,
  type VisitQRPayload,
} from "./qr-token-codec";

export const QR_EXPIRING_SOON_MS = 15 * 60 * 1000;

export interface VerifyVisitQRResult {
  valid: true;
  payload: VisitQRPayload;
  visitId: string;
  organizationId: string;
  branchId: string | null;
  expiresAt: Date;
  expiringSoon: boolean;
}

/**
 * Cryptographically verifies a visit QR token before any visit lookup.
 * Throws QRError when the token cannot be trusted.
 */
export function verifyVisitQR(
  token: string,
  expectedOrganizationId?: string,
): VerifyVisitQRResult {
  const payload = decodeVisitQrToken(token);
  const organizationId = resolvePayloadOrganizationId(payload);
  const expiresAt = new Date(payload.exp * 1000);

  if (expiresAt.getTime() <= Date.now()) {
    throw new QRError("QR_EXPIRED");
  }

  if (
    expectedOrganizationId &&
    organizationId !== expectedOrganizationId
  ) {
    throw new QRError("QR_TENANT_MISMATCH");
  }

  const expiringSoon =
    expiresAt.getTime() - Date.now() <= QR_EXPIRING_SOON_MS;

  return {
    valid: true,
    payload,
    visitId: payload.visitId,
    organizationId,
    branchId: payload.branchId ?? null,
    expiresAt,
    expiringSoon,
  };
}
