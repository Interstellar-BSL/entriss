"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { pollVisitStatus } from "@/lib/visits/visit-engine-client";
import {
  isVisitApprovedForCheckIn,
  isVisitCheckedIn,
  isVisitPendingApproval,
} from "@/lib/visits/workflow-engine";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { VisitStatus } from "@prisma/client";

const DEFAULT_POLL_MS = 4_000;
const WARN_AFTER_FAILURES = 3;
const RETRY_NOW_AFTER_FAILURES = 5;

export function useVisitApprovalPoll({
  visitId,
  enabled,
  intervalMs = DEFAULT_POLL_MS,
  onApproved,
  onRejected,
}: {
  visitId: string | null;
  enabled: boolean;
  intervalMs?: number;
  onApproved: (visit: VisitWithRelations) => void;
  onRejected?: (visit: VisitWithRelations) => void;
}) {
  const [visit, setVisit] = useState<VisitWithRelations | null>(null);
  const [polling, setPolling] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastFailureAt, setLastFailureAt] = useState<Date | null>(null);
  const busyRef = useRef(false);

  const tick = useCallback(async () => {
    if (!visitId || !enabled || busyRef.current) {
      return;
    }

    busyRef.current = true;
    setPolling(true);

    try {
      const next = await pollVisitStatus(visitId);
      setVisit(next);
      setLastCheckedAt(new Date());
      setConsecutiveFailures(0);
      setLastFailureAt(null);

      if (isVisitApprovedForCheckIn(next.status) || isVisitCheckedIn(next.status)) {
        onApproved(next);
        return;
      }

      if (
        next.status === VisitStatus.REJECTED ||
        next.status === VisitStatus.CANCELLED
      ) {
        onRejected?.(next);
        return;
      }

      if (!isVisitPendingApproval(next.status)) {
        return;
      }
    } catch {
      setConsecutiveFailures((current) => current + 1);
      setLastFailureAt(new Date());
    } finally {
      busyRef.current = false;
      setPolling(false);
    }
  }, [enabled, onApproved, onRejected, visitId]);

  useEffect(() => {
    if (!enabled || !visitId) {
      return;
    }

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, tick, visitId]);

  return {
    visit,
    polling,
    lastCheckedAt,
    consecutiveFailures,
    lastFailureAt,
    showConnectionWarning: consecutiveFailures >= WARN_AFTER_FAILURES,
    showRetryNow: consecutiveFailures >= RETRY_NOW_AFTER_FAILURES,
    refresh: tick,
  };
}
