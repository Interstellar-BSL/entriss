"use client";

import { useEffect, useState } from "react";

import { ThermalBadgePreview } from "@/components/visits/thermal-badge-preview";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/client";
import { getVisitBadge, getVisitBadgeA4 } from "@/lib/api/visits";
import { printBadge } from "@/lib/badge-print";
import type { A4BadgeLayout, ThermalBadgeData } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

export function BadgePreviewModal({
  visit,
  open,
  onClose,
  initialBadge,
}: {
  visit: VisitWithRelations | null;
  open: boolean;
  onClose: () => void;
  initialBadge?: ThermalBadgeData | null;
}) {
  const [badge, setBadge] = useState<ThermalBadgeData | null>(null);
  const [a4Layout, setA4Layout] = useState<A4BadgeLayout | null>(null);
  const [showA4, setShowA4] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !visit) {
      return;
    }

    let cancelled = false;

    async function loadBadge() {
      setLoading(true);
      setError(null);
      setShowA4(false);
      setA4Layout(null);

      try {
        const data =
          initialBadge && initialBadge.visitId === visit!.id
            ? initialBadge
            : await getVisitBadge(visit!.id);

        if (!cancelled) {
          setBadge(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load badge preview.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBadge();

    return () => {
      cancelled = true;
    };
  }, [open, visit, initialBadge]);

  async function handleToggleA4() {
    if (!visit) {
      return;
    }

    if (showA4) {
      setShowA4(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const layout = await getVisitBadgeA4(visit.id);
      setA4Layout(layout);
      setShowA4(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load A4 layout.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    if (!badge) {
      return;
    }

    void printBadge(badge, {
      format: showA4 ? "a4" : "thermal",
      printSource: "badge-preview-modal",
    }).catch((error) => {
      console.error("[BADGE_PRINT]", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to open print preview.",
      );
    });
  }

  if (!visit) {
    return null;
  }

  const visitorName = `${visit.visitor.firstName} ${visit.visitor.lastName}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Print badge"
      className="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">
          {visitorName} · {visit.branch.name}
        </p>

        {loading ? <LoadingState label="Loading badge…" /> : null}

        {error ? <ErrorState message={error} /> : null}

        {!loading && !error && badge && !showA4 ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)]/30 p-3">
            <ThermalBadgePreview badge={badge} />
          </div>
        ) : null}

        {!loading && !error && showA4 && a4Layout ? (
          <div className="rounded-md border border-[var(--border)] p-4">
            <p className="mb-3 text-xs font-medium uppercase text-[var(--muted)]">
              A4 fallback preview
            </p>
            {a4Layout.sections.map((section) => (
              <div key={section.type} className="mb-3 last:mb-0">
                <p className="text-[10px] uppercase text-[var(--muted)]">
                  {section.type}
                </p>
                {Object.entries(section.content).map(([key, value]) =>
                  value ? (
                    <p key={key} className="text-sm text-[var(--foreground)]">
                      {value}
                    </p>
                  ) : null,
                )}
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!badge || loading}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => void handleToggleA4()}
          >
            {showA4 ? "Thermal view" : "A4 fallback"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
