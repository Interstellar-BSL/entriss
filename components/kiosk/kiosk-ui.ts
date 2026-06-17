/**
 * Shared kiosk UI tokens — one system, responsive density only.
 * See docs/KIOSK-INTERACTION-STANDARD.md
 */

export const KIOSK_SUCCESS_DISMISS_MS = 3_500;
export const KIOSK_ERROR_AUTO_RETURN_MS = 3_500;
export const KIOSK_RESOLVING_LABEL = "Resolving…";

/** Page / flow backgrounds */
export const kioskPageGradient =
  "bg-gradient-to-b from-[var(--surface-muted)]/80 to-[var(--card)]";

export const kioskFlowPageGradient =
  "bg-gradient-to-b from-[var(--surface-muted)]/50 to-[var(--card)]";

export const kioskHeaderBar =
  "shrink-0 border-b border-[var(--border)]/80 bg-[var(--card)]/90 px-6 py-5 backdrop-blur-sm sm:px-8";

export const kioskHeaderBackButton =
  "inline-flex h-14 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 text-base font-medium text-[var(--foreground)] shadow-sm transition-all hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.98]";

export const kioskStickyFooter =
  "sticky bottom-0 -mx-6 mt-auto border-t border-[var(--border)] bg-[var(--card)]/95 px-6 py-5 backdrop-blur-sm";

/** Scales up on large screens — pair with Button variant classes */
export const kioskTouchPrimary =
  "h-14 min-h-[3.5rem] rounded-2xl text-base font-semibold lg:h-16 lg:min-h-[4rem] lg:text-lg";

export const kioskTouchSecondary =
  "h-12 min-h-[3rem] rounded-2xl text-base font-medium lg:h-14 lg:min-h-[3rem]";

export const kioskTouchGhost =
  "h-12 min-h-[3rem] text-base text-[var(--muted)] lg:h-14 lg:min-h-[3rem]";

export const kioskInput =
  "h-14 min-h-[3.5rem] rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-lg text-[var(--foreground)] shadow-sm lg:h-16 lg:min-h-[4rem] lg:px-5 lg:text-xl";

export const kioskScreenTitle =
  "text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl lg:text-4xl";

export const kioskStepTitle =
  "text-xl font-semibold text-[var(--foreground)] sm:text-2xl lg:text-3xl";

export const kioskSupporting =
  "text-base text-[var(--muted)] sm:text-lg lg:text-xl";

export const kioskConfirmCard =
  "w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl lg:rounded-[1.75rem] lg:p-8 lg:shadow-2xl";

export const kioskConfirmName =
  "text-center text-3xl font-semibold tracking-tight text-[var(--foreground)] lg:text-4xl";

export const kioskConfirmMeta =
  "mt-2 text-center text-base text-[var(--muted)] lg:text-lg";

export const kioskConfirmPrompt =
  "mb-4 text-center text-lg font-medium text-[var(--foreground)] lg:mb-5 lg:text-xl";

export const kioskSurfaceCard =
  "rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm";

export const kioskSurfaceMuted =
  "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]";

export const kioskFlowMain =
  "mx-auto flex w-full flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8";

export const kioskFlowWide = "max-w-2xl lg:max-w-5xl";

export const kioskFlowNarrow = "max-w-xl lg:max-w-2xl";

export const kioskPhaseEnter =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150";

/** Login-density controls for contained flows (e.g. booking search). */
export const kioskCompactInput =
  "h-11 min-h-[2.75rem] rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-base text-[var(--foreground)] shadow-sm";

export const kioskCompactButton = "h-11 min-h-[2.75rem] text-base font-medium";

export const kioskCompactTitle = "text-lg font-semibold text-[var(--foreground)]";

export const kioskCompactSupporting = "text-sm text-[var(--muted)]";

/** Home screen option card */
export const kioskHomeOptionCard =
  "group flex min-h-[17rem] flex-col items-center justify-between rounded-[1.75rem] border-2 border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)] active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)]";
