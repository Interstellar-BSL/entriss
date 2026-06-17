"use client";

import { useEffect } from "react";

/**
 * Kiosk lockdown: discourage accidental browser navigation and context menus.
 * Does not block OS-level gestures; staff can still leave via direct URL.
 */
export function useKioskLockdown(enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function onContextMenu(event: MouseEvent) {
      event.preventDefault();
    }

    function onPopState() {
      window.history.pushState({ kiosk: true }, "", window.location.href);
    }

    window.history.pushState({ kiosk: true }, "", window.location.href);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("popstate", onPopState);
    };
  }, [enabled]);
}

/**
 * Request fullscreen on first user interaction (opt-in only).
 * Not used by default — kiosk flows stay contained in the browser window.
 */
export function useKioskFullscreen(enabled = false) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") {
      return;
    }

    let entered = false;

    async function tryFullscreen() {
      if (entered || document.fullscreenElement) {
        return;
      }

      try {
        await document.documentElement.requestFullscreen();
        entered = true;
      } catch {
        // User denied or browser blocked — kiosk still works windowed
      }
    }

    const events = ["pointerdown", "touchstart", "keydown"] as const;

    for (const eventName of events) {
      document.addEventListener(eventName, tryFullscreen, { once: false });
    }

    return () => {
      for (const eventName of events) {
        document.removeEventListener(eventName, tryFullscreen);
      }
    };
  }, [enabled]);
}
