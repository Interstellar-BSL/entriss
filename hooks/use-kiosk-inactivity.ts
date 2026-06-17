"use client";

import { useEffect, useRef } from "react";

const DEFAULT_TIMEOUT_MS = 60_000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "touchmove",
  "scroll",
] as const;

/**
 * Resets a timer on user activity. Calls `onIdle` after `timeoutMs` without input.
 */
export function useKioskInactivity(
  onIdle: () => void,
  enabled = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timerId = window.setTimeout(() => {
      onIdleRef.current();
    }, timeoutMs);

    function resetTimer() {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        onIdleRef.current();
      }, timeoutMs);
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }

    return () => {
      window.clearTimeout(timerId);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, resetTimer);
      }
    };
  }, [enabled, timeoutMs]);
}
