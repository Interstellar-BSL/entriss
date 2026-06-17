import { createHash, randomBytes } from "node:crypto";

/** Cryptographically random invite token (sent in email URL only). */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Compare incoming token against stored hash (supports legacy plain-token rows). */
export function verifyInviteToken(token: string, tokenHash: string): boolean {
  if (!token || !tokenHash) {
    return false;
  }
  return hashInviteToken(token) === tokenHash || token === tokenHash;
}

export function isInviteExpired(invite: { expiresAt: Date }): boolean {
  return invite.expiresAt.getTime() <= Date.now();
}
