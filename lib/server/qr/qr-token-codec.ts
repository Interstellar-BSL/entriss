import {
  base64UrlDecode,
  base64UrlEncode,
  getQrSigningSecret,
  signHmacSha256,
  verifyHmacSha256,
} from "@/lib/utils/crypto";

import { QRError } from "@/lib/server/errors/qr.errors";

export const QR_TOKEN_VERSION = "v1";
export const QR_TOKEN_PREFIX = `entriss.${QR_TOKEN_VERSION}`;

export interface VisitQRPayload {
  v: 1;
  visitId: string;
  /** Canonical tenant id (legacy field name). */
  organizationId: string;
  /** Alias for organizationId — included on newly issued tokens. */
  orgId?: string;
  branchId?: string;
  iat?: number;
  exp: number;
}

export function encodeVisitQrToken(payload: VisitQRPayload): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = signHmacSha256(body, getQrSigningSecret());
  return `${QR_TOKEN_PREFIX}.${body}.${signature}`;
}

export function decodeVisitQrToken(token: string): VisitQRPayload {
  const trimmed = token.trim();
  const parts = trimmed.split(".");

  if (parts.length !== 4 || parts[0] !== "entriss" || parts[1] !== QR_TOKEN_VERSION) {
    throw new QRError("QR_MALFORMED");
  }

  const [, , body, signature] = parts;

  if (!body || !signature) {
    throw new QRError("QR_MALFORMED");
  }

  if (!verifyHmacSha256(body, signature, getQrSigningSecret())) {
    throw new QRError("QR_INVALID_SIGNATURE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecode(body));
  } catch {
    throw new QRError("QR_MALFORMED");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("v" in parsed) ||
    parsed.v !== 1 ||
    !("visitId" in parsed) ||
    typeof parsed.visitId !== "string" ||
    !("exp" in parsed) ||
    typeof parsed.exp !== "number"
  ) {
    throw new QRError("QR_MALFORMED");
  }

  const record = parsed as Record<string, unknown>;
  const organizationId =
    typeof record.organizationId === "string"
      ? record.organizationId
      : typeof record.orgId === "string"
        ? record.orgId
        : null;

  if (!organizationId) {
    throw new QRError("QR_MALFORMED");
  }

  return {
    v: 1,
    visitId: record.visitId as string,
    organizationId,
    orgId: typeof record.orgId === "string" ? record.orgId : organizationId,
    branchId: typeof record.branchId === "string" ? record.branchId : undefined,
    iat: typeof record.iat === "number" ? record.iat : undefined,
    exp: record.exp as number,
  };
}

export function resolvePayloadOrganizationId(payload: VisitQRPayload): string {
  return payload.organizationId || payload.orgId || "";
}
