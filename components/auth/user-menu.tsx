"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { ChevronDownIcon, LogOutIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const displayName = user?.name ?? user?.email ?? "User";
  const initials = getInitials(user?.name, user?.email ?? "U");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-2 pl-1.5 pr-2"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-medium text-[var(--on-brand)]">
          {initials}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-[var(--foreground)] sm:inline">
          {displayName}
        </span>
        <ChevronDownIcon className="text-[var(--muted)]" />
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg">
          <div className="border-b border-[var(--border)] px-3 py-2">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">
              {displayName}
            </p>
            <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
          </div>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
            )}
            onClick={() => void signOut({ callbackUrl: "/login" })}
          >
            <LogOutIcon />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
