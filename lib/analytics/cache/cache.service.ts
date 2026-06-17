export const ANALYTICS_CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const analyticsCache = new Map<string, CacheEntry<unknown>>();

/** In-memory response cache; snapshot hits are promoted here on read. */

export function getAnalyticsCache<T>(key: string): T | null {
  const cached = analyticsCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    analyticsCache.delete(key);
    return null;
  }

  return cached.value as T;
}

export function setAnalyticsCache<T>(
  key: string,
  data: T,
  ttlMs = ANALYTICS_CACHE_TTL_MS,
) {
  analyticsCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value: data,
  });
}

export function invalidateAnalyticsCache(pattern: string) {
  const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;

  for (const key of analyticsCache.keys()) {
    if (key.startsWith(prefix)) {
      analyticsCache.delete(key);
    }
  }
}

export async function withAnalyticsCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = ANALYTICS_CACHE_TTL_MS,
): Promise<T> {
  const cached = getAnalyticsCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await loader();
  setAnalyticsCache(key, value, ttlMs);
  return value;
}
