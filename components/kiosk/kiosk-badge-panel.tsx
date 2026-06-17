"use client";

import { ThermalBadgePreview } from "@/components/visits/thermal-badge-preview";
import type { ThermalBadgeData } from "@/lib/visits/types";
import { cn } from "@/lib/utils/cn";

/** Printable badge surface — left panel in kiosk badge screen. */
export function KioskBadgePanel({
  badge,
  photoUrl,
  className,
}: {
  badge: ThermalBadgeData;
  photoUrl?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[28rem] items-center justify-center rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-6 shadow-inner",
        className,
      )}
    >
      <ThermalBadgePreview badge={badge} photoUrl={photoUrl} />
    </div>
  );
}
