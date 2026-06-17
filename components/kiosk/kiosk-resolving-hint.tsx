import { KIOSK_RESOLVING_LABEL } from "@/components/kiosk/kiosk-ui";

/** Inline resolving indicator — during fetch only */
export function KioskResolvingHint({ label = KIOSK_RESOLVING_LABEL }: { label?: string }) {
  return (
    <p className="text-center text-sm font-medium text-[var(--muted)]" aria-live="polite">
      {label}
    </p>
  );
}

/** Overlay resolving indicator — camera / full-bleed contexts */
export function KioskResolvingOverlay({ label = KIOSK_RESOLVING_LABEL }: { label?: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/35"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
      <p className="mt-4 text-lg font-medium text-[var(--on-brand)]/90 lg:text-xl">{label}</p>
    </div>
  );
}
