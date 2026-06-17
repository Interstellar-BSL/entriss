"use client";

import { KioskBadgeDetailsPanel } from "@/components/kiosk/kiosk-badge-details-panel";
import { KioskBadgePanel } from "@/components/kiosk/kiosk-badge-panel";
import {
  kioskCompactSupporting,
  kioskCompactTitle,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { printThermalBadge } from "@/lib/kiosk/print-thermal-badge";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import type { ThermalBadgeData } from "@/lib/visits/types";
import { cn } from "@/lib/utils/cn";

export function KioskBookingBadge({
  visit,
  badge,
  photoUrl,
  onContinue,
}: {
  visit: VisitWithRelations;
  badge: ThermalBadgeData;
  photoUrl?: string | null;
  onContinue: () => void;
}) {
  return (
    <section
      aria-label="Visitor badge"
      className={cn(
        "rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm sm:p-6",
        kioskPhaseEnter,
      )}
    >
      <div className="no-print">
        <h2 className={kioskCompactTitle}>Your visitor badge</h2>
        <p className={cn("mt-1", kioskCompactSupporting)}>
          Review your badge, print when ready, then continue.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 items-stretch gap-5 md:grid-cols-[420px,minmax(0,1fr)] md:gap-6">
        <KioskBadgePanel badge={badge} photoUrl={photoUrl} />
        <KioskBadgeDetailsPanel
          visit={visit}
          badge={badge}
          photoUrl={photoUrl}
          onPrint={() =>
            void printThermalBadge(badge, { photoUrl }).catch((error) => {
              console.error("[BADGE_PRINT]", error);
            })
          }
          onContinue={onContinue}
        />
      </div>
    </section>
  );
}
