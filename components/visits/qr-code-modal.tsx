"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/client";
import { generateVisitQR } from "@/lib/api/visits";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function QrCodeModal({
  visit,
  open,
  onClose,
  onGenerated,
}: {
  visit: VisitWithRelations | null;
  open: boolean;
  onClose: () => void;
  onGenerated?: (visitId: string, token: string, expiresAt: string) => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !visit) {
      return;
    }

    let cancelled = false;

    async function loadQr() {
      setLoading(true);
      setError(null);
      setCopied(false);

      try {
        const existingToken = visit!.qrToken;
        const existingExpiry = visit!.qrExpiresAt
          ? String(visit!.qrExpiresAt)
          : null;

        let nextToken = existingToken;
        let nextExpiry = existingExpiry;

        if (!nextToken) {
          const result = await generateVisitQR(visit!.id);
          nextToken = result.token;
          nextExpiry = result.expiresAt;
          onGenerated?.(visit!.id, result.token, result.expiresAt);
        }

        if (!nextToken) {
          throw new Error("QR token unavailable");
        }

        const dataUrl = await QRCode.toDataURL(nextToken, {
          width: 256,
          margin: 1,
          errorCorrectionLevel: "M",
        });

        if (!cancelled) {
          setToken(nextToken);
          setExpiresAt(nextExpiry);
          setQrDataUrl(dataUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load QR code.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadQr();

    return () => {
      cancelled = true;
    };
  }, [open, visit, onGenerated]);

  async function handleRegenerate() {
    if (!visit) {
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const result = await generateVisitQR(visit.id);
      const dataUrl = await QRCode.toDataURL(result.token, {
        width: 256,
        margin: 1,
        errorCorrectionLevel: "M",
      });

      setToken(result.token);
      setExpiresAt(result.expiresAt);
      setQrDataUrl(dataUrl);
      onGenerated?.(visit.id, result.token, result.expiresAt);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to regenerate QR.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!token) {
      return;
    }

    await navigator.clipboard.writeText(token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (!visit) {
    return null;
  }

  const visitorName = `${visit.visitor.firstName} ${visit.visitor.lastName}`;

  return (
    <Modal open={open} onClose={onClose} title="Visit QR code" className="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">
          {visitorName} · {visit.branch.name}
        </p>

        {loading ? <LoadingState label="Generating QR…" /> : null}

        {error ? (
          <ErrorState message={error} onRetry={() => void handleRegenerate()} />
        ) : null}

        {!loading && !error && qrDataUrl ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR code for ${visitorName}`}
              className="rounded-md border border-[var(--border)] bg-[var(--card)] p-2"
              width={256}
              height={256}
            />
            {expiresAt ? (
              <p className="text-xs text-[var(--muted)]">
                Expires {formatExpiry(expiresAt)}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!token || loading}
            onClick={() => void handleCopy()}
          >
            {copied ? "Copied" : "Copy token"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => void handleRegenerate()}
          >
            Regenerate
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
