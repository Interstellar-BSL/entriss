"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Locks an async handler while in flight — prevents duplicate submissions.
 */
export function useAsyncAction<T extends unknown[]>(
  action: (...args: T) => Promise<void>,
) {
  const [pending, setPending] = useState(false);
  const lockRef = useRef(false);

  const run = useCallback(
    async (...args: T) => {
      if (lockRef.current) {
        return;
      }

      lockRef.current = true;
      setPending(true);

      try {
        await action(...args);
      } finally {
        lockRef.current = false;
        setPending(false);
      }
    },
    [action],
  );

  return { run, pending, disabled: pending };
}
