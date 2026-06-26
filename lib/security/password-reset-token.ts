import {
  generateInviteToken,
  hashInviteToken,
  verifyInviteToken,
} from "@/lib/security/invite-token";

/** Password reset links expire after one hour. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/** Cryptographically random reset token (raw value only appears in email URLs). */
export function generatePasswordResetToken(): string {
  return generateInviteToken();
}

export function hashPasswordResetToken(token: string): string {
  return hashInviteToken(token);
}

export function verifyPasswordResetToken(
  token: string,
  storedTokenHash: string,
): boolean {
  return verifyInviteToken(token, storedTokenHash);
}

export function isPasswordResetExpired(record: { expires: Date }): boolean {
  return record.expires.getTime() <= Date.now();
}

export function passwordResetExpiresAt(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MS);
}
