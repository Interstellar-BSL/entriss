"use client";

import {
  kioskCompactButton,
  kioskCompactTitle,
} from "@/components/kiosk/kiosk-ui";
import { Button } from "@/components/ui/button";
import { kioskHostLabel, kioskVisitorName } from "@/lib/kiosk/visit-display";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import type { ThermalBadgeData } from "@/lib/visits/types";
import { cn } from "@/lib/utils/cn";

function formatVisitTime(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function KioskBadgeDetailsPanel({
  visit,
  badge,
  photoUrl,
  onPrint,
  onContinue,
}: {
  visit: VisitWithRelations;
  badge: ThermalBadgeData;
  photoUrl?: string | null;
  onPrint: () => void;
  onContinue: () => void;
}) {
  const displayPhoto = photoUrl ?? badge.visitor.photoUrl;
  const checkInLabel = visit.checkedInAt ? "Checked in" : "Scheduled";
  const checkInValue = formatVisitTime(
    visit.checkedInAt ?? visit.scheduledAt,
  );

  return (
    <aside
      className={cn(
        "badge-details-panel flex min-h-[28rem] min-w-0 flex-col rounded-xl border border-emerald-100 bg-white p-5 shadow-sm",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {displayPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayPhoto}
            alt=""
            className="h-28 w-28 shrink-0 rounded-2xl border-2 border-zinc-100 object-cover shadow-sm sm:h-32 sm:w-32"
          />
        ) : (
          <div
            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-400 sm:h-32 sm:w-32"
            aria-hidden
          >
            No photo
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className={kioskCompactTitle}>{kioskVisitorName(visit)}</h3>
          {visit.visitor.company ? (
            <p className="mt-1 text-sm text-zinc-600">{visit.visitor.company}</p>
          ) : null}
          <p className="mt-2 text-sm text-zinc-600">
            Host: {kioskHostLabel(visit)}
          </p>
          <p className="text-sm text-zinc-600">{visit.branch.name}</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-zinc-100 pt-5 text-sm">
        {visit.purpose ? (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-400">Purpose</dt>
            <dd className="text-right font-medium text-zinc-800">
              {visit.purpose}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-400">{checkInLabel}</dt>
          <dd className="text-right text-zinc-700">{checkInValue}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-400">Badge code</dt>
          <dd className="font-mono text-right font-semibold text-zinc-900">
            {badge.badgeNumber}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-400">Badge status</dt>
          <dd className="text-right font-medium text-emerald-700">Ready</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-400">Print status</dt>
          <dd className="text-right font-medium text-emerald-800 motion-safe:animate-pulse">
            Printing badge…
          </dd>
        </div>
      </dl>

      <div className="no-print mt-auto pt-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            className={cn("sm:min-w-[10rem]", kioskCompactButton)}
            onClick={onPrint}
          >
            Print badge
          </Button>
          <Button
            type="button"
            className={cn("sm:min-w-[10rem]", kioskCompactButton)}
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          For best results, disable &ldquo;Headers and footers&rdquo; in print
          settings.
        </p>
      </div>
    </aside>
  );
}
