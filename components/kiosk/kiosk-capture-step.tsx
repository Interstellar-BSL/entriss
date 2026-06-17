"use client";

import type { KioskCapturedDocument } from "@/components/kiosk/kiosk-document-upload";
import { KioskDocumentCapture } from "@/components/kiosk/kiosk-document-upload";
import { KioskPhotoCapture } from "@/components/kiosk/kiosk-photo-capture";
import type { KioskRegisterFormValues } from "@/components/kiosk/kiosk-register-form";
import {
  kioskCompactButton,
  kioskCompactSupporting,
  kioskCompactTitle,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import { Button } from "@/components/ui/button";
import type { BranchOption } from "@/lib/visits/types";
import { cn } from "@/lib/utils/cn";

export function KioskRegisterCapture({
  values,
  hostLabel,
  selectedBranch,
  photoUrl,
  onPhotoChange,
  documents,
  onDocumentsChange,
  requirePhoto,
  requireDocuments,
  captureError,
  executing,
  cameraActive,
  onContinue,
  onBack,
}: {
  values: KioskRegisterFormValues;
  hostLabel: string;
  selectedBranch: BranchOption | undefined;
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  documents: KioskCapturedDocument[];
  onDocumentsChange: (documents: KioskCapturedDocument[]) => void;
  requirePhoto: boolean;
  requireDocuments: boolean;
  captureError?: string | null;
  executing?: boolean;
  cameraActive?: boolean;
  onContinue: () => void;
  onBack: () => void;
}) {
  const displayName = `${values.firstName} ${values.lastName}`.trim();
  const contactLine = [values.email, values.phone].filter(Boolean).join(" · ");

  return (
    <section
      aria-label="Capture photo and documents"
      className={cn("space-y-4", kioskPhaseEnter)}
    >
      <div>
        <h2 className={kioskCompactTitle}>Photo and documents</h2>
        <p className={cn("mt-1", kioskCompactSupporting)}>
          Use the camera to capture your photo and any required documents. File
          uploads are not available on this kiosk.
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
              cameraActive={cameraActive}
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
          <p className="text-sm font-medium text-[var(--muted)]">Registration preview</p>

          <div className="mt-3 space-y-1">
            <p className="text-base font-semibold text-[var(--foreground)]">
              {displayName || "New visitor"}
            </p>
            {values.company ? (
              <p className="text-sm text-[var(--muted)]">{values.company}</p>
            ) : null}
          </div>

          <dl className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Host</dt>
              <dd className="text-right font-medium text-[var(--foreground)]">{hostLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Branch</dt>
              <dd className="text-right">{selectedBranch?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Purpose</dt>
              <dd className="text-right">{values.purpose || "—"}</dd>
            </div>
            {contactLine ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Contact</dt>
                <dd className="text-right">{contactLine}</dd>
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

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className={cn("sm:min-w-[8rem]", kioskCompactButton)}
          disabled={executing}
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className={cn("sm:min-w-[10rem]", kioskCompactButton)}
          disabled={executing}
          onClick={onContinue}
        >
          {executing ? "Please wait…" : "Continue to review"}
        </Button>
      </div>
    </section>
  );
}
