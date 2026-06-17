"use client";

import { useCallback } from "react";

/**
 * Stub handlers for dashboard quick actions.
 * Wire to POST /api/v1/visits, /visits/check-in, /visits/search in later phases.
 */
export function useQuickActions() {
  const registerVisitor = useCallback(() => {
    // POST /api/v1/visits
    console.info("[quick-action] Register visitor — not yet implemented");
  }, []);

  const checkInVisitor = useCallback(() => {
    // POST /api/v1/visits/check-in
    console.info("[quick-action] Check in visitor — not yet implemented");
  }, []);

  const searchVisitor = useCallback(() => {
    // POST /api/v1/visits/search
    console.info("[quick-action] Search visitor — not yet implemented");
  }, []);

  return { registerVisitor, checkInVisitor, searchVisitor };
}
