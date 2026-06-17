"use client";

import { useState } from "react";

import { Header } from "@/components/layout/header";
import { RoutePermissionGuard } from "@/components/layout/route-permission-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { OrgBrandingProvider } from "@/components/providers/org-branding-provider";
import { cn } from "@/lib/utils/cn";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <OrgBrandingProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--foreground)]/40"
            aria-label="Close navigation overlay"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-50 h-full w-60 shadow-xl">
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main data-app-main className="flex-1 overflow-y-auto">
          <RoutePermissionGuard>{children}</RoutePermissionGuard>
        </main>
      </div>
    </div>
    </OrgBrandingProvider>
  );
}

export function PageContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 motion-safe:animate-alive-fade-in", className)}>
      {children}
    </div>
  );
}
