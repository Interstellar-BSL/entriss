"use client";

import { ThermalBadgePreview } from "@/components/visits/thermal-badge-preview";
import { Button } from "@/components/ui/button";
import { printThermalBadge } from "@/lib/kiosk/print-thermal-badge";
import type { ThermalBadgeData } from "@/lib/visits/types";

export function KioskInlineBadge({
  badge,
  showPrintButton = true,
}: {
  badge: ThermalBadgeData;
  showPrintButton?: boolean;
}) {
  return (
    <div className="text-center">
      <ThermalBadgePreview badge={badge} />
      {showPrintButton ? (
        <div className="no-print mt-4">
          <Button
            type="button"
            className="h-12 min-w-[10rem] text-base"
            onClick={() =>
              void printThermalBadge(badge).catch((error) => {
                console.error("[BADGE_PRINT]", error);
              })
            }
          >
            Print badge
          </Button>
          <p className="mt-2 text-xs text-zinc-400">
            For best results, disable &ldquo;Headers and footers&rdquo; in print
            settings.
          </p>
        </div>
      ) : null}
    </div>
  );
}
