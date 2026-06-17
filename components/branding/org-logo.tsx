"use client";

import { BrandMark } from "@/components/branding/brand-mark";
import type { ResolvedOrgBranding } from "@/lib/branding";
import { cn } from "@/lib/utils/cn";

const SIZE_CLASSES = {
  sm: {
    box: "h-7 w-7 rounded-md text-xs",
    text: "text-sm",
  },
  md: {
    box: "h-8 w-8 rounded-md text-xs",
    text: "text-sm",
  },
  lg: {
    box: "h-10 w-10 rounded-lg text-sm",
    text: "text-base",
  },
} as const;

export function OrgLogo({
  branding,
  size = "md",
  showName = true,
  className,
}: {
  branding: Pick<
    ResolvedOrgBranding,
    "logoUrl" | "primaryColor" | "organizationName"
  >;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}) {
  const initial =
    branding.organizationName?.trim().charAt(0).toUpperCase() ?? "E";
  const label = branding.organizationName?.trim() || "Your organization";
  const sizes = SIZE_CLASSES[size];

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <BrandMark
        logoUrl={branding.logoUrl}
        initial={initial}
        primaryColor={branding.primaryColor}
        alt={label}
        boxClassName={sizes.box}
      />
      {showName ? (
        <span
          className={cn(
            "truncate font-semibold tracking-tight text-[var(--foreground)]",
            sizes.text,
          )}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
