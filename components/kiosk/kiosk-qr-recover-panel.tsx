"use client";

import { CameraOff, QrCode } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  kioskCompactButton,
  kioskCompactSupporting,
  kioskCompactTitle,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function KioskQrRecoverPanel({
  icon: Icon = QrCode,
  title,
  message,
  primaryLabel,
  onPrimary,
  onFindBooking,
  onHome,
  secondaryLabel = "Find booking",
  tertiaryLabel = "Return home",
  middleLabel,
  onMiddle,
}: {
  icon?: LucideIcon;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  onFindBooking: () => void;
  onHome: () => void;
  secondaryLabel?: string;
  tertiaryLabel?: string;
  middleLabel?: string;
  onMiddle?: () => void;
}) {
  return (
    <section
      aria-live="polite"
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50/90 p-5 shadow-sm",
        kioskPhaseEnter,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={kioskCompactTitle}>{title}</h2>
          <p className={cn("mt-1", kioskCompactSupporting)}>{message}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {primaryLabel && onPrimary ? (
          <Button
            type="button"
            className={cn("sm:min-w-[10rem]", kioskCompactButton)}
            onClick={onPrimary}
          >
            {primaryLabel}
          </Button>
        ) : null}
        {middleLabel && onMiddle ? (
          <Button
            type="button"
            variant="secondary"
            className={cn("sm:min-w-[10rem]", kioskCompactButton)}
            onClick={onMiddle}
          >
            {middleLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className={cn("sm:min-w-[10rem]", kioskCompactButton)}
          onClick={onFindBooking}
        >
          {secondaryLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={cn("sm:min-w-[10rem]", kioskCompactButton)}
          onClick={onHome}
        >
          {tertiaryLabel}
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-amber-800/80">
        Need help? Please see reception for assistance.
      </p>
    </section>
  );
}

export function KioskQrCameraRecoverPanel({
  title,
  message,
  showRetry,
  onRetry,
  onFindBooking,
  onHome,
  secondaryLabel,
  tertiaryLabel,
  middleLabel,
  onMiddle,
}: {
  title: string;
  message: string;
  showRetry?: boolean;
  onRetry: () => void;
  onFindBooking: () => void;
  onHome: () => void;
  secondaryLabel?: string;
  tertiaryLabel?: string;
  middleLabel?: string;
  onMiddle?: () => void;
}) {
  return (
    <KioskQrRecoverPanel
      icon={CameraOff}
      title={title}
      message={message}
      primaryLabel={showRetry ? "Retry camera" : undefined}
      onPrimary={showRetry ? onRetry : undefined}
      onFindBooking={onFindBooking}
      onHome={onHome}
      secondaryLabel={secondaryLabel}
      tertiaryLabel={tertiaryLabel}
      middleLabel={middleLabel}
      onMiddle={onMiddle}
    />
  );
}
