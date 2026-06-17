/**
 * In-memory login rate limiter (per email + IP).
 * Replace with Redis for multi-instance production deployments.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function buildKey(email: string, ip: string): string {
  return `${email.toLowerCase().trim()}:${ip}`;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkLoginRateLimit(
  email: string,
  ip: string,
): RateLimitResult {
  const key = buildKey(email, ip);
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    retryAfterSeconds: 0,
  };
}

export function recordFailedLogin(email: string, ip: string): void {
  const key = buildKey(email, ip);
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return;
  }

  entry.count += 1;
  loginAttempts.set(key, entry);
}

export function clearLoginRateLimit(email: string, ip: string): void {
  loginAttempts.delete(buildKey(email, ip));
}

/** @internal Test helper */
export function resetLoginRateLimits(): void {
  loginAttempts.clear();
}
