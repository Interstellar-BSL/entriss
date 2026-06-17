"use client";

import { useEffect, useState } from "react";
import { FileImage } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listActivity, type ActivityItem } from "@/lib/api/activity";
import { ApiError } from "@/lib/api/client";
import {
  normalizeCapturedDocuments,
  type VisitCapturedDocumentRecord,
} from "@/lib/visits/check-in-media";

interface VisitorDocumentEntry extends VisitCapturedDocumentRecord {
  visitId?: string;
  sourceLabel: string;
}

function extractDocumentsFromActivity(
  items: ActivityItem[],
): VisitorDocumentEntry[] {
  const documents: VisitorDocumentEntry[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const metadata = item.metadata ?? {};
    const photoUrl =
      typeof metadata.photoUrl === "string"
        ? metadata.photoUrl
        : typeof metadata.photo === "string"
          ? metadata.photo
          : null;

    if (photoUrl && !seen.has(`photo:${photoUrl}`)) {
      seen.add(`photo:${photoUrl}`);
      documents.push({
        id: `photo-${item.id}`,
        type: "photo",
        imageUrl: photoUrl,
        label: "Check-in photo",
        visitId: item.visitId,
        sourceLabel: item.description,
      });
    }

    const captured = normalizeCapturedDocuments(metadata.documents);
    for (const document of captured) {
      const key = `${document.id}:${document.imageUrl}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      documents.push({
        ...document,
        visitId: item.visitId,
        sourceLabel: item.description,
      });
    }
  }

  return documents;
}

export function VisitorDocumentsPanel({ visitorId }: { visitorId: string }) {
  const [documents, setDocuments] = useState<VisitorDocumentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await listActivity({ visitorId, limit: 100 });
        if (!cancelled) {
          setDocuments(extractDocumentsFromActivity(result.items));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load visitor documents.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [visitorId]);

  if (loading) {
    return <LoadingState label="Loading documents…" />;
  }

  if (error) {
    return <ErrorState title="Could not load documents" message={error} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileImage className="h-4 w-4 text-[var(--muted)]" aria-hidden />
          <CardTitle>Documents & verification media</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No captured IDs, documents, or verification media found for this
            visitor.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((document) => (
              <article
                key={`${document.id}-${document.imageUrl}`}
                className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]"
              >
                <div className="aspect-[4/3] bg-[var(--card)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={document.imageUrl}
                    alt={document.label ?? "Visitor document"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-0.5 px-3 py-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {document.label ?? document.type ?? "Document"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{document.sourceLabel}</p>
                  {document.visitId ? (
                    <p className="text-[11px] text-[var(--muted)]">
                      Visit {document.visitId.slice(0, 8)}…
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
