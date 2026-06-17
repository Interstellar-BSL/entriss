import { ServiceError } from "@/lib/services/errors";

export type QrErrorCode =
  | "QR_MALFORMED"
  | "QR_INVALID_SIGNATURE"
  | "QR_EXPIRED"
  | "QR_TENANT_MISMATCH"
  | "QR_REVOKED";

const DEFAULT_MESSAGES: Record<QrErrorCode, string> = {
  QR_MALFORMED: "QR code is malformed or unreadable.",
  QR_INVALID_SIGNATURE: "QR code signature is invalid.",
  QR_EXPIRED: "QR code has expired.",
  QR_TENANT_MISMATCH: "QR code does not belong to this organization.",
  QR_REVOKED: "QR code has been revoked or replaced.",
};

export class QRError extends ServiceError {
  readonly qrCode: QrErrorCode;

  constructor(code: QrErrorCode, message?: string) {
    super(code, message ?? DEFAULT_MESSAGES[code]);
    this.name = "QRError";
    this.qrCode = code;
  }
}

export function isQRError(error: unknown): error is QRError {
  return error instanceof QRError;
}
