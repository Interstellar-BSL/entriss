"use client";

import type { KioskCapturedDocument } from "@/components/kiosk/kiosk-document-upload";
import { KioskDocumentCapture } from "@/components/kiosk/kiosk-document-upload";
import { KioskPhotoCapture } from "@/components/kiosk/kiosk-photo-capture";
import {
  kioskCompactButton,
  kioskCompactSupporting,
  kioskCompactTitle,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isKioskCaptureReady } from "@/lib/kiosk/capture-validation";
import { kioskHostLabel, kioskVisitorName } from "@/lib/kiosk/visit-display";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { cn } from "@/lib/utils/cn";

function formatScheduledTime(value: string | Date | null | undefined) {
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

export function KioskBookingCapture({
  visit,
  photoUrl,
  onPhotoChange,
  documents,
  onDocumentsChange,
  requirePhoto,
  requireDocuments,
  captureError,
  executing,
  onContinue,
}: {
  visit: VisitWithRelations;
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  documents: KioskCapturedDocument[];
  onDocumentsChange: (documents: KioskCapturedDocument[]) => void;
  requirePhoto: boolean;
  requireDocuments: boolean;
  captureError?: string | null;
  executing?: boolean;
  onContinue: () => void;
}) {
  const captureReady = isKioskCaptureReady({
    requirePhoto,
    requireDocuments,
    photoUrl,
    documents,
  });

  return (
    <section
      aria-label="Capture photo and documents"
      className={cn("space-y-4", kioskPhaseEnter)}
    >
      <div>
        <h2 className={kioskCompactTitle}>Capture for check-in</h2>
        <p className={cn("mt-1", kioskCompactSupporting)}>
          Use the camera to capture your photo and any required documents.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <KioskPhotoCapture
              captureType="photo"
              photoUrl={photoUrl}
              onPhotoChange={onPhotoChange}
              disabled={executing}
              required={requirePhoto}
              compact
              cameraActive
            />
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <KioskDocumentCapture
              documents={documents}
              onChange={onDocumentsChange}
              disabled={executing}
              required={requireDocuments}
              compact
            />
          </div>
        </div>

        <aside className="flex min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-[var(--muted)]">Visit context</p>
            <StatusBadge status={visit.status} />
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-base font-semibold text-[var(--foreground)]">
              {kioskVisitorName(visit)}
            </p>
            {visit.visitor.company ? (
              <p className="text-sm text-[var(--muted)]">{visit.visitor.company}</p>
            ) : null}
          </div>

          <dl className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Host</dt>
              <dd className="text-right font-medium text-[var(--foreground)]">
                {kioskHostLabel(visit)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Branch</dt>
              <dd className="text-right">{visit.branch.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Scheduled</dt>
              <dd className="text-right">
                {formatScheduledTime(visit.scheduledAt ?? visit.checkedInAt)}
              </dd>
            </div>
            {visit.purpose ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Purpose</dt>
                <dd className="text-right">{visit.purpose}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Requirements
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
              <li>
                Visitor photo:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {requirePhoto ? "Required" : "Optional"}
                </span>
              </li>
              <li>
                Supporting documents:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {requireDocuments ? "Required" : "Optional"}
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {captureError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {captureError}
        </p>
      ) : null}

      <Button
        type="button"
        className={cn("w-full sm:w-auto", kioskCompactButton)}
        disabled={executing || !captureReady}
        onClick={onContinue}
      >
        {executing ? "Checking in…" : "Continue to check-in"}
      </Button>
    </section>
  );
}
