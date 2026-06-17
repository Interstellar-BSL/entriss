import { compare, hash } from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plainText: string): Promise<string> {
  return hash(plainText, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plainText: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(plainText, passwordHash);
}
