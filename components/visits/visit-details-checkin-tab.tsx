"use client";

import { memo } from "react";

import { VisitBadgeQr } from "@/components/visits/visit-badge-qr";
import {
  DetailRow,
  SectionCard,
} from "@/components/visits/visit-details-shared";
import { Button } from "@/components/ui/button";
import {
  findQrScanTime,
  formatVisitDateTime,
  formatVisitDuration,
  resolveCheckInMedia,
} from "@/lib/visits/visit-detail-display";
import { canPrintVisitBadge } from "@/lib/visits/actions";
import type { VisitDetail, ThermalBadgeData } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

function isQrExpired(expiresAt: string | Date | null | undefined) {
  if (!expiresAt) {
    return false;
  }
  return new Date(expiresAt).getTime() < Date.now();
}

export const VisitDetailsCheckInTab = memo(function VisitDetailsCheckInTab({
  visit,
  onGenerateQr,
  onPrintBadge,
}: {
  visit: VisitDetail;
  onGenerateQr: (visit: VisitWithRelations) => void;
  onPrintBadge: (
    visit: VisitWithRelations,
    badge?: ThermalBadgeData | null,
  ) => void;
}) {
  const media = resolveCheckInMedia(visit);
  const photoUrl = media.photoUrl;
  const documents = media.documents ?? [];
  const hasCaptureData = Boolean(photoUrl) || documents.length > 0;
  const qrExpired = visit.qrToken ? isQrExpired(visit.qrExpiresAt) : false;
  const qrScanTime = findQrScanTime(visit.events ?? []);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
      <div className="space-y-4">
        <SectionCard title="Visitor photo">
          <div className="flex min-h-[220px] items-center justify-center overflow-hidden py-3">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Visitor check-in photo"
                className="max-h-[280px] w-full rounded-lg object-contain"
              />
            ) : (
              <span className="px-4 text-center text-sm text-[var(--muted)]">
                No photo captured for this visit
              </span>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Captured documents">
          {documents.length > 0 ? (
            <div className="grid gap-3 py-3 sm:grid-cols-2">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]"
                >
                  <div className="aspect-[4/3] bg-[var(--card)]">
                    <img
                      src={document.imageUrl}
                      alt={document.label ?? "Captured document"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="border-t border-[var(--border)] px-2.5 py-2">
                    <p className="text-xs font-medium text-[var(--foreground)]">
                      {document.label ?? "Document"}
                    </p>
                    {document.capturedAt ? (
                      <p className="text-[11px] text-[var(--muted)]">
                        {formatVisitDateTime(document.capturedAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-3 text-sm text-[var(--muted)]">No documents captured</p>
          )}
        </SectionCard>

        {!hasCaptureData ? (
          <p className="text-sm text-[var(--muted)]">
            No capture data is stored for this visit yet.
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <SectionCard title="Arrival">
          <DetailRow
            label="Check-in time"
            value={formatVisitDateTime(visit.checkedInAt)}
          />
          <DetailRow
            label="Check-out time"
            value={formatVisitDateTime(visit.checkedOutAt)}
          />
          <DetailRow
            label="Duration"
            value={formatVisitDuration(visit.checkedInAt, visit.checkedOutAt)}
          />
        </SectionCard>

        <SectionCard title="Badge">
          <DetailRow label="Badge code" value={visit.badgeNumber ?? "—"} />
          <DetailRow
            label="Print status"
            value={visit.badgeNumber ? "Printed" : "Not printed"}
          />
          {canPrintVisitBadge(visit.status) ? (
            <div className="border-t border-[var(--border)] py-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onPrintBadge(visit)}
              >
                {visit.badgeNumber ? "Reprint badge" : "Print badge"}
              </Button>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="QR code">
          {visit.qrToken ? (
            <div className="space-y-3 py-3">
              <div className="flex items-start gap-4">
                <VisitBadgeQr payload={visit.qrToken} size={96} />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-[var(--foreground)]">
                    {qrExpired ? "Expired" : "Active"}
                  </p>
                  <p className="text-[var(--muted)]">
                    Expires {formatVisitDateTime(visit.qrExpiresAt)}
                  </p>
                  {qrScanTime ? (
                    <p className="mt-1 text-[var(--muted)]">
                      Scanned {formatVisitDateTime(qrScanTime)}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onGenerateQr(visit)}
              >
                View QR details
              </Button>
            </div>
          ) : (
            <p className="py-3 text-sm text-[var(--muted)]">No QR issued yet.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
});
