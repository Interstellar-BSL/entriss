/**
 * Deduplicates concurrent identical GET requests so mount-time parallel
 * components share one in-flight fetch (no backend/cache change).
 */

const inFlightGets = new Map<string, Promise<unknown>>();

export function dedupeInFlightGet<T>(
  key: string,
  execute: () => Promise<T>,
): Promise<T> {
  const existing = inFlightGets.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = execute().finally(() => {
    inFlightGets.delete(key);
  });

  inFlightGets.set(key, promise);
  return promise;
}
