import { ServiceError } from "@/lib/services/errors";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

export interface ApiRateLimitConfig {
  key: string;
  maxRequests: number;
  windowMs: number;
}

export interface ApiRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class RateLimitError extends ServiceError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      "RATE_LIMITED",
      `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
    );
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function checkApiRateLimit(
  config: ApiRateLimitConfig,
): ApiRateLimitResult {
  const now = Date.now();
  const entry = buckets.get(config.key);

  if (!entry || entry.resetAt <= now) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      retryAfterSeconds: 0,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    retryAfterSeconds: 0,
  };
}

export function recordApiRateLimit(config: ApiRateLimitConfig): void {
  const now = Date.now();
  const entry = buckets.get(config.key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(config.key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return;
  }

  entry.count += 1;
  buckets.set(config.key, entry);
}

export function enforceApiRateLimit(
  scope: string,
  identifier: string,
  maxRequests: number,
  windowMs: number,
): void {
  const key = `${scope}:${identifier}`;
  const result = checkApiRateLimit({ key, maxRequests, windowMs });

  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSeconds);
  }

  recordApiRateLimit({ key, maxRequests, windowMs });
}

/** @internal Test helper */
export function resetApiRateLimits(): void {
  buckets.clear();
}
