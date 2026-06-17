import { BrandMark } from "@/components/branding/brand-mark";
import type { BrandingConfig } from "@/lib/settings/types";
import { cn } from "@/lib/utils/cn";

export type KioskBranding = BrandingConfig & {
  organizationName?: string | null;
};

export function KioskLogo({
  branding,
  size = "lg",
  className,
}: {
  branding: KioskBranding;
  size?: "lg" | "md";
  className?: string;
}) {
  const dimensions =
    size === "lg"
      ? "h-20 w-20 rounded-3xl text-2xl shadow-lg"
      : "h-14 w-14 rounded-2xl text-xl shadow-lg";
  const initial =
    branding.organizationName?.trim().charAt(0).toUpperCase() ?? "E";

  return (
    <BrandMark
      logoUrl={branding.logoUrl}
      initial={initial}
      primaryColor={branding.primaryColor}
      alt={
        branding.organizationName
          ? `${branding.organizationName} logo`
          : "Organization logo"
      }
      boxClassName={cn(dimensions, className)}
      initialClassName="text-2xl"
    />
  );
}
