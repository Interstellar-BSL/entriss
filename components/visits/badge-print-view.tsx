"use client";

/**
 * On-screen badge print preview helper (not used by printThermalBadge).
 * Printing uses static HTML via lib/kiosk/badge-print-html.ts.
 */

import { useEffect, useRef } from "react";

import { VisitBadgeQr } from "@/components/visits/visit-badge-qr";
import type { BadgePrintFormat } from "@/lib/kiosk/badge-print-styles";
import type { ThermalBadgeData } from "@/lib/visits/types";
import { cn } from "@/lib/utils/cn";

export function BadgePrintView({
  badge,
  photoUrl,
  format = "thermal",
  onReady,
  className,
}: {
  badge: ThermalBadgeData;
  photoUrl?: string | null;
  format?: BadgePrintFormat;
  onReady?: () => void;
  className?: string;
}) {
  const readyRef = useRef(false);
  const pendingAssetsRef = useRef(0);
  const displayPhoto = photoUrl ?? badge.visitor.photoUrl;
  const qrSize = format === "a4" ? 160 : 112;

  useEffect(() => {
    readyRef.current = false;
    pendingAssetsRef.current = 0;

    if (badge.organization.logoUrl) {
      pendingAssetsRef.current += 1;
    }
    if (displayPhoto) {
      pendingAssetsRef.current += 1;
    }
    if (badge.qr.payload) {
      pendingAssetsRef.current += 1;
    }

    if (pendingAssetsRef.current === 0) {
      onReady?.();
      readyRef.current = true;
    }
  }, [
    badge.organization.logoUrl,
    badge.qr.payload,
    badge.visitId,
    displayPhoto,
    onReady,
  ]);

  function markAssetReady() {
    if (readyRef.current) {
      return;
    }

    pendingAssetsRef.current = Math.max(0, pendingAssetsRef.current - 1);
    if (pendingAssetsRef.current === 0) {
      readyRef.current = true;
      onReady?.();
    }
  }

  return (
    <div
      className={cn("badge-print-view", className)}
      data-format={format}
      id="badge-print-root"
    >
      <header className="badge-print-header">
        {badge.organization.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={badge.organization.logoUrl}
            alt=""
            className="badge-print-logo"
            onLoad={markAssetReady}
            onError={markAssetReady}
          />
        ) : (
          <p className="badge-print-org">{badge.organization.name}</p>
        )}
      </header>

      {displayPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayPhoto}
          alt=""
          className="badge-print-photo"
          onLoad={markAssetReady}
          onError={markAssetReady}
        />
      ) : null}

      <dl className="badge-print-fields">
        {badge.layout.fields.map((field) => (
          <div key={field.key} className="badge-print-field">
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>

      <div className="badge-print-codes">
        {badge.qr.payload ? (
          <div className="badge-print-qr">
            <VisitBadgeQr
              payload={badge.qr.payload}
              size={qrSize}
              onReady={markAssetReady}
            />
          </div>
        ) : null}
      </div>

      <p className="badge-print-meta">
        {format === "a4"
          ? `A4 · ${badge.badgeNumber}`
          : `Thermal · ${badge.layout.widthMm}×${badge.layout.heightMm} mm`}
      </p>
    </div>
  );
}
