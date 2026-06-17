"use client";

import { useCallback, useRef, useState } from "react";

import { useActionFeedback } from "@/components/providers/action-feedback-provider";

export interface UseAsyncActionOptions {
  /** Shown while the action runs (toast / inline feedback). */
  pendingMessage?: string;
  /** Shown briefly on success. */
  successMessage?: string;
  /** Shown on failure when error is not an Error with message. */
  errorMessage?: string;
  /** When true, surfaces success via action feedback. */
  notifyOnSuccess?: boolean;
  /** When true, surfaces errors via action feedback. */
  notifyOnError?: boolean;
}

/**
 * UI-only helper: loading state, duplicate-click guard, optional feedback toasts.
 * Does not change API behavior.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions = {},
) {
  const feedback = useActionFeedback();
  const [loading, setLoading] = useState(false);
  const lockRef = useRef(false);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (lockRef.current || loading) {
        return undefined;
      }

      lockRef.current = true;
      setLoading(true);

      if (options.pendingMessage) {
        feedback.showPending(options.pendingMessage);
      }

      try {
        const result = await action(...args);

        if (options.notifyOnSuccess && options.successMessage) {
          feedback.showSuccess(options.successMessage);
        } else {
          feedback.dismiss();
        }

        return result;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : options.errorMessage ?? "Something went wrong. Please try again.";

        if (options.notifyOnError !== false) {
          feedback.showError(message);
        } else {
          feedback.dismiss();
        }

        throw error;
      } finally {
        lockRef.current = false;
        setLoading(false);
      }
    },
    [action, feedback, loading, options],
  );

  return { run, loading, isLoading: loading };
}
