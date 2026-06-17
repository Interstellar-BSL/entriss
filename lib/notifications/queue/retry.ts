const RETRY_DELAYS_MS = [0, 10_000, 30_000, 120_000, 600_000] as const;

export const DEFAULT_MAX_RETRIES = 5;

/**
 * Enterprise retry schedule with exponential backoff + jitter.
 * attempt 1 → immediate, 2 → 10s, 3 → 30s, 4 → 2m, 5 → 10m
 */
export function calculateRetryDelay(attempt: number): number {
  const index = Math.max(0, Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1));
  const base = RETRY_DELAYS_MS[index] ?? RETRY_DELAYS_MS.at(-1)!;
  const jitter = Math.floor(Math.random() * Math.max(base * 0.1, 50));
  return base + jitter;
}

export function nextRetryDate(attempt: number): Date {
  return new Date(Date.now() + calculateRetryDelay(attempt));
}
