"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { PlatformLogo } from "@/components/branding/platform-logo";
import { useOrgBranding } from "@/components/providers/org-branding-provider";
import {
  AnalyticsIcon,
  CalendarIcon,
  DashboardIcon,
  ScanIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/icons";
import { filterNavItemsForPermissions } from "@/lib/rbac/navigation";
import { cn } from "@/lib/utils/cn";

const ICONS = {
  Dashboard: DashboardIcon,
  Visitors: UsersIcon,
  Visits: CalendarIcon,
  Hosts: UsersIcon,
  Reception: ScanIcon,
  Analytics: AnalyticsIcon,
  Settings: SettingsIcon,
} as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { branding } = useOrgBranding();
  const permissions = session?.user?.permissions ?? [];
  const navItems = filterNavItemsForPermissions(permissions);
  const footerLabel =
    branding.organizationName?.trim() || session?.user?.organizationName || "Your organization";

  return (
    <aside
      data-app-sidebar
      className="flex h-full w-60 flex-col border-r border-[var(--border)] bg-[var(--card)]"
    >
      <div className="flex h-14 items-center border-b border-[var(--border)] px-5">
        <PlatformLogo size="sm" onClick={onNavigate} href="/" />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/dashboard/settings"
                ? pathname.startsWith(item.href) ||
                  pathname.startsWith("/settings")
                : pathname.startsWith(item.href);
          const Icon = ICONS[item.label as keyof typeof ICONS] ?? DashboardIcon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--surface-muted)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] px-5 py-4">
        <p className="truncate text-xs font-medium text-[var(--muted)]">
          {footerLabel}
        </p>
      </div>
    </aside>
  );
}
