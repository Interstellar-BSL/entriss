import type { VisitEventRecord } from "@/lib/services/internal/visit-include";

export interface VisitCapturedDocumentRecord {
  id: string;
  type?: string;
  imageUrl: string;
  label?: string;
  capturedAt?: string | null;
}

export interface VisitCheckInMediaRecord {
  photoUrl: string | null;
  documents: VisitCapturedDocumentRecord[];
}

export interface PersistCheckInCaptureInput {
  photoUrl?: string | null;
  documents?: VisitCapturedDocumentRecord[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeDocument(value: unknown): VisitCapturedDocumentRecord | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const imageUrl =
    typeof record.imageUrl === "string"
      ? record.imageUrl
      : typeof record.previewUrl === "string"
        ? record.previewUrl
        : null;

  if (!imageUrl) {
    return null;
  }

  return {
    id: typeof record.id === "string" ? record.id : `doc-${imageUrl.slice(-8)}`,
    type: typeof record.type === "string" ? record.type : "document",
    imageUrl,
    label: typeof record.label === "string" ? record.label : undefined,
    capturedAt:
      typeof record.capturedAt === "string"
        ? record.capturedAt
        : record.capturedAt instanceof Date
          ? record.capturedAt.toISOString()
          : null,
  };
}

export function normalizeCapturedDocuments(
  value: unknown,
): VisitCapturedDocumentRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeDocument(entry))
    .filter((entry): entry is VisitCapturedDocumentRecord => entry !== null);
}

export function extractCheckInMediaFromVisit(input: {
  visitor: { photoUrl?: string | null };
  events?: VisitEventRecord[];
  checkIn?: VisitCheckInMediaRecord;
  media?: {
    photo?: string | null;
    photoUrl?: string | null;
    documents?: unknown[];
  };
}): VisitCheckInMediaRecord {
  if (input.checkIn) {
    return {
      photoUrl: input.checkIn.photoUrl ?? null,
      documents: input.checkIn.documents ?? [],
    };
  }

  const events = input.events ?? [];
  let photoUrl =
    input.media?.photoUrl ??
    input.media?.photo ??
    input.visitor.photoUrl ??
    null;
  let documents = normalizeCapturedDocuments(input.media?.documents);

  for (const event of [...events].reverse()) {
    const payload = asRecord(event.payload);
    if (!payload) {
      continue;
    }

    if (
      typeof payload.photoUrl === "string" &&
      payload.photoUrl.trim().length > 0
    ) {
      photoUrl = payload.photoUrl;
    } else if (
      typeof payload.photo === "string" &&
      payload.photo.trim().length > 0
    ) {
      photoUrl = payload.photo;
    }

    const payloadDocuments = normalizeCapturedDocuments(payload.documents);
    if (payloadDocuments.length > 0) {
      documents = payloadDocuments;
    }

    if (
      event.type === "check_in.capture" ||
      event.type === "visit.checked_in.manual" ||
      event.type === "visit.checked_in.qr" ||
      event.type === "check_in.approved"
    ) {
      if (photoUrl || documents.length > 0) {
        break;
      }
    }
  }

  return {
    photoUrl,
    documents,
  };
}
