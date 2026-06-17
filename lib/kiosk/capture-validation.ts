import type { KioskCapturedDocument } from "@/components/kiosk/kiosk-document-upload";

export function isKioskCaptureReady({
  requirePhoto,
  requireDocuments,
  photoUrl,
  documents,
}: {
  requirePhoto: boolean;
  requireDocuments: boolean;
  photoUrl: string | null;
  documents: KioskCapturedDocument[];
}): boolean {
  return (
    (!requirePhoto || Boolean(photoUrl)) &&
    (!requireDocuments || documents.length > 0)
  );
}

export function validateKioskCapture({
  requirePhoto,
  requireDocuments,
  photoUrl,
  documents,
}: {
  requirePhoto: boolean;
  requireDocuments: boolean;
  photoUrl: string | null;
  documents: KioskCapturedDocument[];
}): { valid: true } | { valid: false; message: string } {
  if (requirePhoto && !photoUrl) {
    return {
      valid: false,
      message: "A visitor photo is required before check-in.",
    };
  }

  if (requireDocuments && documents.length === 0) {
    return {
      valid: false,
      message: "At least one identification document is required.",
    };
  }

  return { valid: true };
}
