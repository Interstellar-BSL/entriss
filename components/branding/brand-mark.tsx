"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

export function BrandMark({
  logoUrl,
  initial,
  primaryColor,
  alt,
  boxClassName,
  initialClassName,
  imageClassName,
}: {
  logoUrl?: string | null;
  initial: string;
  primaryColor: string;
  alt: string;
  boxClassName: string;
  initialClassName?: string;
  imageClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const normalizedLogoUrl = logoUrl?.trim() || null;
  const showImage = Boolean(normalizedLogoUrl) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [normalizedLogoUrl]);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-[var(--surface-muted)]",
        boxClassName,
      )}
      aria-hidden={!alt}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={normalizedLogoUrl}
          src={normalizedLogoUrl!}
          alt={alt}
          className={cn("h-full w-full object-cover object-center", imageClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center font-bold text-[var(--on-brand)]",
            initialClassName,
          )}
          style={{ backgroundColor: primaryColor }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
