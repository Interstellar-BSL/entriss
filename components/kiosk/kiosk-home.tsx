"use client";

import { QrCode, Search, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { KioskScreen } from "@/components/kiosk/kiosk-shell";
import { KioskLogo, type KioskBranding } from "@/components/kiosk/kiosk-branding";
import { KioskDateTime } from "@/components/kiosk/kiosk-datetime";
import { kioskPageGradient } from "@/components/kiosk/kiosk-ui";
import { cn } from "@/lib/utils/cn";

const OPTIONS: Array<{
  id: KioskScreen;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: {
    iconBg: string;
    iconColor: string;
    border: string;
    hoverBorder: string;
    hoverShadow: string;
  };
}> = [
  {
    id: "qr",
    title: "Scan QR",
    description: "Fast check-in or check-out with your invitation code",
    icon: QrCode,
    accent: {
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      border: "border-emerald-100",
      hoverBorder: "hover:border-emerald-200",
      hoverShadow: "hover:shadow-emerald-100/80",
    },
  },
  {
    id: "booking",
    title: "Find Booking",
    description: "Look up your visit by name, email, or phone",
    icon: Search,
    accent: {
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      border: "border-blue-100",
      hoverBorder: "hover:border-blue-200",
      hoverShadow: "hover:shadow-blue-100/80",
    },
  },
  {
    id: "register",
    title: "New Visitor",
    description: "Register as a walk-in guest at this location",
    icon: UserPlus,
    accent: {
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      border: "border-amber-100",
      hoverBorder: "hover:border-amber-200",
      hoverShadow: "hover:shadow-amber-100/80",
    },
  },
];

export function KioskHome({
  branding,
  allowWalkIns = true,
  qrEnabled = true,
  onSelect,
}: {
  branding: KioskBranding;
  allowWalkIns?: boolean;
  qrEnabled?: boolean;
  onSelect: (screen: KioskScreen) => void;
}) {
  const visibleOptions = OPTIONS.filter((option) => {
    if (option.id === "register" && !allowWalkIns) {
      return false;
    }
    if (option.id === "qr" && !qrEnabled) {
      return false;
    }
    return true;
  });
  const welcomeTitle = branding.organizationName
    ? `Welcome to ${branding.organizationName}`
    : "Welcome";

  const subtitle =
    branding.welcomeMessage?.trim() ||
    "Please choose how you would like to check in";

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col", kioskPageGradient)}>
      <header className="shrink-0 px-8 pb-6 pt-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <div className="flex flex-col items-center text-center lg:flex-row lg:items-center lg:gap-6 lg:text-left">
            <KioskLogo branding={branding} size="lg" />
            <div className="mt-6 lg:mt-0">
              <h1
                id="kiosk-welcome-heading"
                className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl"
              >
                {welcomeTitle}
              </h1>
              <p className="mt-2 max-w-xl text-lg text-[var(--muted)]">{subtitle}</p>
            </div>
          </div>
          <div className="hidden shrink-0 lg:block">
            <KioskDateTime />
          </div>
        </div>
        <div className="mt-6 lg:hidden">
          <KioskDateTime />
        </div>
      </header>

      <main
        id="kiosk-main"
        role="main"
        aria-labelledby="kiosk-welcome-heading"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-12 pt-2"
      >
        <div
          className={cn(
            "grid grid-cols-1 gap-5 md:gap-6",
            visibleOptions.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3",
          )}
        >
          {visibleOptions.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                aria-label={`${option.title}. ${option.description}`}
                className={cn(
                  "group flex min-h-[17rem] flex-col items-center justify-between rounded-[1.75rem] border-2 bg-[var(--card)] p-8 text-center",
                  "shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] transition-all duration-200",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)]",
                  "active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100",
                  option.accent.border,
                  option.accent.hoverBorder,
                  option.accent.hoverShadow,
                  "hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)]",
                )}
              >
                <span
                  className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-3xl transition-transform duration-200 group-hover:scale-105",
                    option.accent.iconBg,
                  )}
                  aria-hidden
                >
                  <Icon
                    className={cn("h-10 w-10", option.accent.iconColor)}
                    strokeWidth={1.75}
                  />
                </span>

                <span className="flex flex-col items-center">
                  <span className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                    {option.title}
                  </span>
                  <span className="mt-3 max-w-[14rem] text-base leading-relaxed text-[var(--muted)]">
                    {option.description}
                  </span>
                </span>

                <span className="text-sm font-medium text-[var(--muted)] transition-colors group-hover:text-[var(--foreground)]">
                  Tap to begin →
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
