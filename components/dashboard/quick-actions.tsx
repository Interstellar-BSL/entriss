"use client";

import Link from "next/link";
import { CalendarPlus, ScanLine, Search, UserPlus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

const actions = [
  {
    href: "/visits/new",
    label: "Schedule visit",
    description: "Book a visit for an existing or new visitor",
    icon: CalendarPlus,
  },
  {
    href: "/kiosk",
    label: "Register visitor",
    description: "Open the kiosk for walk-in registration",
    icon: UserPlus,
  },
  {
    href: "/reception",
    label: "Open reception",
    description: "Go to the reception console",
    icon: ScanLine,
  },
  {
    href: "/visitors",
    label: "Search visitor",
    description: "Find a visitor profile",
    icon: Search,
  },
] as const;

const actionClassName = cn(
  "flex flex-col items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left shadow-sm",
  "transition-colors hover:bg-[var(--surface-muted)]",
);

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className={actionClassName}>
              <Icon className="h-4 w-4 text-[var(--muted)]" />
              <span className="text-sm font-medium text-[var(--foreground)]">{action.label}</span>
              <span className="text-xs text-[var(--muted)]">{action.description}</span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
