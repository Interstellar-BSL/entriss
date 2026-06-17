"use client";

import Link from "next/link";
import { useState } from "react";

import { QrCodeModal } from "@/components/visits/qr-code-modal";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VisitStatus } from "@/app/generated/prisma/enums";
import type { RegisterVisitResponse } from "@/lib/visits/types";
import { kioskHostLabel } from "@/lib/kiosk/visit-display";

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function VisitConfirmation({
  result,
  onScheduleAnother,
}: {
  result: RegisterVisitResponse;
  onScheduleAnother: () => void;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const { visit, visitor } = result;
  const canShowQr =
    visit.status === VisitStatus.APPROVED ||
    visit.status === VisitStatus.CHECKED_IN;

  return (
    <>
      <Card className="max-w-2xl">
        <CardContent className="space-y-6 p-6">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Visit scheduled successfully
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              {visitor.firstName} {visitor.lastName}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={visit.status} />
            {visit.branch.requiresApproval ? (
              <span className="text-xs text-[var(--muted)]">
                This branch may require host approval
              </span>
            ) : null}
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--muted)]">Branch</dt>
              <dd className="font-medium text-[var(--foreground)]">{visit.branch.name}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Host</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {kioskHostLabel(visit)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Scheduled</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {formatDateTime(visit.scheduledAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Purpose</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {visit.purpose ?? "—"}
              </dd>
            </div>
          </dl>

          {(visit.status === VisitStatus.PENDING ||
            visit.status === VisitStatus.PENDING) && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This visit is pending approval. The visitor will be notified when
              approved and can check in with their QR code.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {canShowQr ? (
              <Button type="button" onClick={() => setQrOpen(true)}>
                {visit.qrToken ? "View QR code" : "Generate QR code"}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={onScheduleAnother}>
              Schedule another
            </Button>
            <Link href="/visits">
              <Button type="button" variant="ghost">
                View all visits
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <QrCodeModal
        visit={visit}
        open={qrOpen}
        onClose={() => setQrOpen(false)}
      />
    </>
  );
}
