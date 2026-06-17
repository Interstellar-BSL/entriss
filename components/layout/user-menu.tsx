"use client";

import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { LogOutIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_ROLES } from "@/lib/rbac/roles";
import { cn } from "@/lib/utils/cn";

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

function formatRoleLabel(role: string | null | undefined): string {
  if (!role) {
    return "Member";
  }

  const matched = DEFAULT_ROLES.find(
    (definition) => definition.slug === role || definition.name === role,
  );
  if (matched) {
    return matched.name;
  }

  return role
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function DropdownDivider() {
  return <div className="my-1 border-t border-[var(--border)]" role="separator" />;
}

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  const user = session?.user;
  const email = user?.email ?? "";
  const name = user?.name ?? null;
  const displayName = name ?? email;
  const initials = email ? getInitials(name, email) : "?";
  const organizationName = user?.organizationName ?? "No organization";
  const roleLabel = formatRoleLabel(user?.role);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (status === "loading") {
    return (
      <div
        className="h-8 w-8 animate-pulse rounded-full bg-[var(--surface-muted)]"
        aria-hidden
      />
    );
  }

  if (!user?.email) {
    return null;
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      menuWidth={256}
      menuClassName="overflow-hidden"
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-full p-0"
          aria-label="Open profile menu"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && !open) {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-semibold text-[var(--on-brand)]",
            )}
          >
            {initials}
          </span>
        </Button>
      }
    >
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
          {displayName}
        </p>
        <p className="truncate text-xs text-[var(--muted)]">{email}</p>
        <p className="mt-2 truncate text-xs font-medium text-[var(--foreground)]">
          {organizationName}
        </p>
        <p className="truncate text-xs text-[var(--muted)]">{roleLabel}</p>
      </div>

      <DropdownDivider />

      <DropdownMenuItem
        label="Profile"
        href="/dashboard/settings"
        onClick={closeMenu}
      />
      <DropdownMenuItem
        label="Settings"
        href="/dashboard/settings"
        onClick={closeMenu}
      />
      <DropdownMenuItem
        label="Notifications"
        href="/notifications"
        onClick={closeMenu}
      />

      <DropdownDivider />

      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
        onClick={() => {
          closeMenu();
          void signOut({ callbackUrl: "/login" });
        }}
      >
        <LogOutIcon />
        Sign out
      </button>
    </DropdownMenu>
  );
}
