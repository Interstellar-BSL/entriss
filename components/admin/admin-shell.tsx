"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/org-requests", label: "Requests" },
  { href: "/admin/organizations", label: "Organizations" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/admin/dashboard" className="text-sm font-semibold text-[var(--foreground)]">
              Entriss Platform
            </Link>
            <nav className="hidden items-center gap-4 sm:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm transition-colors",
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? "font-medium text-[var(--foreground)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
