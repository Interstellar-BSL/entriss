import { createHmac, timingSafeEqual } from "node:crypto";

const BASE64URL_ENCODING = "base64url" as const;

export function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString(BASE64URL_ENCODING);
}

export function base64UrlDecode(value: string): string {
  return Buffer.from(value, BASE64URL_ENCODING).toString("utf8");
}

export function signHmacSha256(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyHmacSha256(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = signHmacSha256(payload, secret);

  try {
    const expectedBuffer = Buffer.from(expected, BASE64URL_ENCODING);
    const actualBuffer = Buffer.from(signature, BASE64URL_ENCODING);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

export function getQrSigningSecret(): string {
  const secret =
    process.env.QR_SIGNING_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

  if (!secret) {
    throw new Error(
      "QR_SIGNING_SECRET or NEXTAUTH_SECRET must be set for QR token signing",
    );
  }

  return secret;
}
