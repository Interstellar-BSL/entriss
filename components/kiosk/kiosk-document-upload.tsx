"use client";

import { useState } from "react";

import { KioskPhotoCapture } from "@/components/kiosk/kiosk-photo-capture";
import { kioskCompactButton } from "@/components/kiosk/kiosk-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface KioskCapturedDocument {
  id: string;
  type: "document";
  imageUrl: string;
  capturedAt: Date;
  label: string;
}

/** @deprecated Use imageUrl */
export type KioskCapturedDocumentLegacy = KioskCapturedDocument & {
  file?: File;
  previewUrl?: string | null;
};

export function KioskDocumentCapture({
  documents,
  onChange,
  disabled,
  required = false,
  compact = false,
}: {
  documents: KioskCapturedDocument[];
  onChange: (documents: KioskCapturedDocument[]) => void;
  disabled?: boolean;
  required?: boolean;
  compact?: boolean;
}) {
  const [captureKey, setCaptureKey] = useState(0);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  function confirmPending() {
    if (!pendingUrl) {
      return;
    }

    onChange([
      ...documents,
      {
        id: crypto.randomUUID(),
        type: "document",
        imageUrl: pendingUrl,
        capturedAt: new Date(),
        label: `Document ${documents.length + 1}`,
      },
    ]);
    setPendingUrl(null);
    setCameraOpen(false);
    setCaptureKey((value) => value + 1);
  }

  function discardPending() {
    setPendingUrl(null);
    setCameraOpen(false);
    setCaptureKey((value) => value + 1);
  }

  function openDocumentCamera() {
    setCameraOpen(true);
    setCaptureKey((value) => value + 1);
  }

  function removeDocument(id: string) {
    onChange(documents.filter((doc) => doc.id !== id));
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={cn("font-medium text-[var(--foreground)]", compact ? "text-sm" : "text-base")}>
          Supporting documents{required ? " (required)" : ""}
        </p>
        <p className={cn("mt-1 text-[var(--muted)]", compact ? "text-xs" : "text-sm")}>
          Capture ID, passport, or business card using the camera
        </p>
      </div>

      {documents.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.imageUrl}
                alt={doc.label}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <span className="truncate text-xs font-medium text-[var(--foreground)]">
                  {doc.label}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 shrink-0 px-2 text-xs text-red-600"
                  disabled={disabled}
                  onClick={() => removeDocument(doc.id)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          No documents captured yet
        </p>
      )}

      {pendingUrl ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingUrl}
            alt="Document preview"
            className="aspect-[4/3] w-full rounded-md object-cover"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className={kioskCompactButton}
              disabled={disabled}
              onClick={discardPending}
            >
              Retake
            </Button>
            <Button
              type="button"
              className={kioskCompactButton}
              disabled={disabled}
              onClick={confirmPending}
            >
              Confirm document
            </Button>
          </div>
        </div>
      ) : cameraOpen ? (
        <KioskPhotoCapture
          key={captureKey}
          captureType="document"
          photoUrl={null}
          onPhotoChange={setPendingUrl}
          disabled={disabled}
          required={required && documents.length === 0}
          compact={compact}
          cameraActive
        />
      ) : (
        <Button
          type="button"
          variant="secondary"
          className={kioskCompactButton}
          disabled={disabled}
          onClick={openDocumentCamera}
        >
          Capture document
        </Button>
      )}
    </div>
  );
}

/** @deprecated Use KioskDocumentCapture */
export const KioskDocumentUpload = KioskDocumentCapture;
