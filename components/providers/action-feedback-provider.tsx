"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils/cn";

type FeedbackTone = "pending" | "success" | "error";

interface FeedbackState {
  id: number;
  tone: FeedbackTone;
  message: string;
}

interface ActionFeedbackContextValue {
  showPending: (message: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  dismiss: () => void;
}

const ActionFeedbackContext = createContext<ActionFeedbackContextValue>({
  showPending: () => undefined,
  showSuccess: () => undefined,
  showError: () => undefined,
  dismiss: () => undefined,
});

const AUTO_DISMISS_MS: Record<FeedbackTone, number> = {
  pending: 0,
  success: 2400,
  error: 4200,
};

export function ActionFeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  const idRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setFeedback(null);
  }, [clearTimer]);

  const show = useCallback(
    (tone: FeedbackTone, message: string) => {
      clearTimer();
      idRef.current += 1;
      const next = { id: idRef.current, tone, message };
      setFeedback(next);

      const delay = AUTO_DISMISS_MS[tone];
      if (delay > 0) {
        dismissTimerRef.current = window.setTimeout(() => {
          setFeedback((current) => (current?.id === next.id ? null : current));
        }, delay);
      }
    },
    [clearTimer],
  );

  const showPending = useCallback(
    (message: string) => show("pending", message),
    [show],
  );
  const showSuccess = useCallback(
    (message: string) => show("success", message),
    [show],
  );
  const showError = useCallback(
    (message: string) => show("error", message),
    [show],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const value = useMemo(
    () => ({ showPending, showSuccess, showError, dismiss }),
    [showPending, showSuccess, showError, dismiss],
  );

  return (
    <ActionFeedbackContext.Provider value={value}>
      {children}
      <ActionFeedbackToast feedback={feedback} onDismiss={dismiss} />
    </ActionFeedbackContext.Provider>
  );
}

function ActionFeedbackToast({
  feedback,
  onDismiss,
}: {
  feedback: FeedbackState | null;
  onDismiss: () => void;
}) {
  if (!feedback) {
    return null;
  }

  const toneClasses: Record<FeedbackTone, string> = {
    pending: "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[120] flex max-w-sm motion-safe:animate-alive-slide-up"
    >
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg",
          toneClasses[feedback.tone],
        )}
      >
        {feedback.tone === "pending" ? (
          <span
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)]"
          />
        ) : null}
        <span className="flex-1">{feedback.message}</span>
        <button
          type="button"
          className="shrink-0 text-xs opacity-70 hover:opacity-100"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function useActionFeedback() {
  return useContext(ActionFeedbackContext);
}
