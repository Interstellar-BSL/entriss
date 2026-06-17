import { ApiError } from "@/lib/api/client";
import { resolveVisitFromQr } from "@/lib/api/visits";
import {
  incrementRetryState,
  resetRetryState,
  type RetryState,
} from "@/lib/shared/retry/retry-state";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

export const RESOLVE_RETRY_MS = 750;
export const MAX_RESOLVE_RETRIES = 3;
export const RESOLVE_TIMEOUT_MS = 12_000;

export type ResolveQrSuccess = {
  kind: "success";
  visit: VisitWithRelations;
  qr: Awaited<ReturnType<typeof resolveVisitFromQr>>["qr"];
  retryState: RetryState;
};

export type ResolveQrFailure = {
  kind: "failed";
  title: string;
  message: string;
  timedOut: boolean;
  retryState: RetryState;
};

export type ResolveQrAborted = {
  kind: "aborted";
};

export type ResolveQrOutcome = ResolveQrSuccess | ResolveQrFailure | ResolveQrAborted;

export async function resolveQrWithRetry(
  qrToken: string,
  options: {
    shouldAbort?: () => boolean;
    onAttemptStart?: (attempt: number, retryState: RetryState) => void;
  } = {},
): Promise<ResolveQrOutcome> {
  let retryState = resetRetryState();
  let lastError: unknown = null;
  let timedOut = false;

  const timeoutId = window.setTimeout(() => {
    timedOut = true;
  }, RESOLVE_TIMEOUT_MS);

  try {
    if (!qrToken.trim()) {
      return {
        kind: "failed",
        title: "QR code not recognized",
        message:
          "This code could not be matched to a visit. Try again or find your booking manually.",
        timedOut: false,
        retryState,
      };
    }

    for (let attempt = 0; attempt < MAX_RESOLVE_RETRIES; attempt += 1) {
      if (options.shouldAbort?.()) {
        return { kind: "aborted" };
      }

      if (timedOut) {
        break;
      }

      options.onAttemptStart?.(attempt, retryState);

      try {
        const resolved = await resolveVisitFromQr(qrToken);
        return {
          kind: "success",
          visit: resolved.visit,
          qr: resolved.qr,
          retryState,
        };
      } catch (error) {
        lastError = error;
        retryState = incrementRetryState(retryState, MAX_RESOLVE_RETRIES);

        if (attempt < MAX_RESOLVE_RETRIES - 1 && !timedOut) {
          await new Promise((resolve) => window.setTimeout(resolve, RESOLVE_RETRY_MS));
        }
      }
    }

    if (timedOut) {
      return {
        kind: "failed",
        title: "Request timed out",
        message: "Request timed out. Please try again.",
        timedOut: true,
        retryState,
      };
    }

    const message =
      lastError instanceof ApiError
        ? lastError.message
        : "This visit could not be found.";

    return {
      kind: "failed",
      title: "QR code not recognized",
      message,
      timedOut: false,
      retryState,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
