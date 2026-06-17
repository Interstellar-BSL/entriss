"use client";

import Link from "next/link";

import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { kioskHostLabel, kioskVisitorName } from "@/lib/kiosk/visit-display";

function formatWhen(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function waitingDuration(updatedAt: string | Date) {
  const ms = Date.now() - new Date(updatedAt).getTime();
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) {
    return `${minutes}m waiting`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours}h waiting`;
}

function visitRequestedAt(visit: VisitWithRelations) {
  const extended = visit as VisitWithRelations & {
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  return extended.createdAt ?? extended.updatedAt ?? visit.scheduledAt ?? new Date();
}

export function ApprovalRequestCard({
  visit,
}: {
  visit: VisitWithRelations;
}) {
  return (
    <Link href={`/visits?visit=${visit.id}&tab=approval`} className="block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[220px,minmax(0,1fr)]">
            <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] p-4 lg:border-b-0 lg:border-r">
              <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
                {visit.visitor.photoUrl ? (
                  <img
                    src={visit.visitor.photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-semibold text-[var(--muted)]">
                    {visit.visitor.firstName.charAt(0)}
                    {visit.visitor.lastName.charAt(0)}
                  </span>
                )}
              </div>
              <p className="mt-3 text-base font-semibold text-[var(--foreground)]">
                {kioskVisitorName(visit)}
              </p>
              {visit.visitor.company ? (
                <p className="text-sm text-[var(--muted)]">{visit.visitor.company}</p>
              ) : null}
            </div>

            <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Visit approval
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    {waitingDuration(visitRequestedAt(visit))}
                  </p>
                </div>
                <StatusBadge status={visit.status} />
              </div>

              <dl className="mt-4 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--muted)]">Host</dt>
                  <dd className="font-medium text-[var(--foreground)]">{kioskHostLabel(visit)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Branch</dt>
                  <dd className="font-medium text-[var(--foreground)]">{visit.branch.name}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Scheduled</dt>
                  <dd>{formatWhen(visit.scheduledAt)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Requested</dt>
                  <dd>{formatWhen(visitRequestedAt(visit))}</dd>
                </div>
                {visit.purpose ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[var(--muted)]">Purpose</dt>
                    <dd>{visit.purpose}</dd>
                  </div>
                ) : null}
              </dl>

              <p className="mt-4 text-sm font-medium text-[var(--link)]">
                Open in Visit Details →
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
