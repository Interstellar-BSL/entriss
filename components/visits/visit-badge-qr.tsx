"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { cn } from "@/lib/utils/cn";

export function VisitBadgeQr({
  payload,
  size = 56,
  className,
  onReady,
}: {
  payload: string;
  size?: number;
  className?: string;
  onReady?: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const url = await QRCode.toDataURL(payload, {
          width: size * 2,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) {
          setDataUrl(url);
        }
      } catch {
        if (!cancelled) {
          setDataUrl(null);
          onReady?.();
        }
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  useEffect(() => {
    if (dataUrl) {
      onReady?.();
    }
  }, [dataUrl, onReady]);

  if (!dataUrl) {
    return (
      <div
        className={cn("animate-pulse rounded bg-[var(--surface-muted)]", className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="Visit QR code"
      width={size}
      height={size}
      className={cn("rounded-sm bg-[var(--card)]", className)}
    />
  );
}
