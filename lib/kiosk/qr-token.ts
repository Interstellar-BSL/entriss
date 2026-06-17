/**
 * @deprecated Client-side QR decoding is forbidden.
 * Send the raw `qrToken` to `POST /api/v1/visits/qr/resolve` for server verification.
 */
export function extractVisitIdFromQrToken(_token: string): null {
  return null;
}
