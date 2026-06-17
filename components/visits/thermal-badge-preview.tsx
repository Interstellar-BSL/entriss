"use client";

import { VisitBadgeQr } from "@/components/visits/visit-badge-qr";
import type { ThermalBadgeData } from "@/lib/visits/types";
import { cn } from "@/lib/utils/cn";

function fontSizeClass(size?: "sm" | "md" | "lg") {
  switch (size) {
    case "lg":
      return "text-lg";
    case "sm":
      return "text-xs";
    default:
      return "text-sm";
  }
}

export function ThermalBadgePreview({
  badge,
  photoUrl,
  className,
}: {
  badge: ThermalBadgeData;
  /** Kiosk-captured photo override (not yet persisted server-side). */
  photoUrl?: string | null;
  className?: string;
}) {
  const displayPhoto = photoUrl ?? badge.visitor.photoUrl;
  return (
    <div
      className={cn(
        "relative mx-auto flex w-[248px] flex-col rounded-md border-2 border-dashed border-[var(--border)] bg-[var(--card)] p-4 shadow-sm",
        className,
      )}
    >
      <div className="text-center">
        {badge.organization.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={badge.organization.logoUrl}
            alt=""
            className="mx-auto mb-2 h-8 max-w-full object-contain"
          />
        ) : (
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {badge.organization.name}
          </p>
        )}
      </div>

      {displayPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayPhoto}
          alt=""
          className="mx-auto mb-3 h-20 w-20 rounded-full object-cover"
        />
      ) : null}

      <div className="space-y-2">
        {badge.layout.fields.map((field) => (
          <div key={field.key}>
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              {field.label}
            </p>
            <p
              className={`${fontSizeClass(field.fontSize)} ${
                field.bold ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]"
              }`}
            >
              {field.key === "checkInTime" && field.value !== "—"
                ? new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(field.value))
                : field.value}
            </p>
          </div>
        ))}
      </div>

      {badge.qr.payload ? (
        <div className="mt-3 flex justify-center">
          <VisitBadgeQr payload={badge.qr.payload} size={52} />
        </div>
      ) : null}

      <p className="mt-3 text-center text-[10px] text-[var(--muted)]">
        Thermal · {badge.layout.widthMm}×{badge.layout.heightMm} mm
      </p>
    </div>
  );
}
