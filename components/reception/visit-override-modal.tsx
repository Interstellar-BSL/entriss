"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

const MIN_REASON_LENGTH = 10;

export type VisitOverrideKind = "force-check-in" | "force-check-out";

const COPY: Record<
  VisitOverrideKind,
  { title: string; actionLabel: string; reasonPlaceholder: string }
> = {
  "force-check-in": {
    title: "Force check-in",
    actionLabel: "Force check-in",
    reasonPlaceholder:
      "e.g. Visitor forgot QR code, camera unavailable at kiosk",
  },
  "force-check-out": {
    title: "Force check-out",
    actionLabel: "Force check-out",
    reasonPlaceholder:
      "e.g. Visitor forgot to check out, emergency building closure",
  },
};

export function VisitOverrideModal({
  open,
  kind,
  visitorName,
  busy = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  kind: VisitOverrideKind;
  visitorName: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: { reason: string; note?: string }) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  if (!open) {
    return null;
  }

  const copy = COPY[kind];
  const trimmedReason = reason.trim();
  const reasonValid = trimmedReason.length >= MIN_REASON_LENGTH;
  const canSubmit = reasonValid && confirmed && !busy;

  function handleClose() {
    setReason("");
    setNote("");
    setConfirmed(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--foreground)]/40"
        aria-label="Close override dialog"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-override-title"
        className="relative z-10 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="visit-override-title" className="text-base font-semibold text-[var(--foreground)]">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Override normal workflow for{" "}
              <span className="font-medium text-[var(--foreground)]">{visitorName}</span>.
              This action is audited and visible in activity history.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="override-reason"
              className="mb-1 block text-xs font-medium text-[var(--foreground)]"
            >
              Reason <span className="text-red-600">*</span>
            </label>
            <Input
              id="override-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={copy.reasonPlaceholder}
              disabled={busy}
              className="text-sm"
            />
            <p
              className={cn(
                "mt-1 text-[11px]",
                reasonValid || trimmedReason.length === 0
                  ? "text-[var(--muted)]"
                  : "text-red-600",
              )}
            >
              Minimum {MIN_REASON_LENGTH} characters ({trimmedReason.length}/
              {MIN_REASON_LENGTH})
            </p>
          </div>

          <div>
            <label
              htmlFor="override-note"
              className="mb-1 block text-xs font-medium text-[var(--foreground)]"
            >
              Additional notes (optional)
            </label>
            <textarea
              id="override-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={busy}
              rows={3}
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-offset-2 focus:ring-2 focus:ring-[var(--ring)]/10"
              placeholder="Any extra context for the audit trail"
            />
          </div>

          <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-950">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              Are you sure you want to override the normal visitor workflow?
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!canSubmit}
            onClick={() =>
              onConfirm({
                reason: trimmedReason,
                note: note.trim() || undefined,
              })
            }
          >
            {busy ? "Processing…" : copy.actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
