export type RetryState = {
  canRetry: boolean;
  retryCount: number;
  lastAttemptAt?: number;
};

export const INITIAL_RETRY_STATE: RetryState = {
  canRetry: true,
  retryCount: 0,
};

export function resetRetryState(): RetryState {
  return { ...INITIAL_RETRY_STATE };
}

export function incrementRetryState(
  state: RetryState,
  maxRetries: number,
): RetryState {
  const retryCount = state.retryCount + 1;

  return {
    canRetry: retryCount < maxRetries,
    retryCount,
    lastAttemptAt: Date.now(),
  };
}

export function canAttemptRetry(state: RetryState, maxRetries: number): boolean {
  return state.retryCount < maxRetries;
}
