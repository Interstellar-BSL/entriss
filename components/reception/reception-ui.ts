import { cn } from "@/lib/utils/cn";

/** Compact operational styling for reception surfaces. */
export const receptionCard = "rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm";
export const receptionCardHeader = "border-b border-[var(--border)] px-3 py-2.5";
export const receptionCardTitle = "text-sm font-semibold text-[var(--foreground)]";
export const receptionCardSubtitle = "mt-0.5 text-[11px] text-[var(--muted)]";
export const receptionCardBody = "px-3 py-2.5";
export const receptionCompactButton = "h-8 px-2.5 text-xs";
export const receptionSectionLabel =
  "text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]";

export function receptionRowButton(className?: string) {
  return cn(
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
    "hover:bg-[var(--surface-muted)]",
    className,
  );
}
