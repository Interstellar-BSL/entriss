"use client";

import { MenuIcon } from "@/components/icons";
import { UserMenu } from "@/components/layout/user-menu";
import { Notifications } from "@/components/notifications/notification-bell";
import { OrgBadge } from "@/components/org/org-badge";
import { Button } from "@/components/ui/button";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <MenuIcon />
        </Button>
        <OrgBadge />
      </div>

      <div className="flex items-center gap-2">
        <Notifications />
        <UserMenu />
      </div>
    </header>
  );
}
