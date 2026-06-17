"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VisitorRecord } from "@/lib/api/visitors";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-2.5 last:border-b-0">
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className="text-right text-sm font-medium text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

export function VisitorIdentityPanel({ visitor }: { visitor: VisitorRecord }) {
  const fullName = `${visitor.firstName} ${visitor.lastName}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identity</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>
          <IdentityRow label="Full name" value={fullName} />
          <IdentityRow label="Email" value={visitor.email ?? "—"} />
          <IdentityRow label="Phone" value={visitor.phone ?? "—"} />
          <IdentityRow label="Company" value={visitor.company ?? "—"} />
          <IdentityRow label="Address" value="—" />
          <IdentityRow label="Record status" value={visitor.isActive === false ? "Inactive" : "Active"} />
          <IdentityRow label="Created" value={formatDate(visitor.createdAt)} />
          <IdentityRow label="Updated" value={formatDate(visitor.updatedAt)} />
        </dl>

        {visitor.notes ? (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Profile notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">
              {visitor.notes}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
