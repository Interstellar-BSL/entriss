"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { ChevronDown, Copy, UserRound } from "lucide-react";

import {
  receptionCard,
  receptionCardBody,
  receptionCardHeader,
  receptionCardSubtitle,
  receptionCardTitle,
  receptionCompactButton,
} from "@/components/reception/reception-ui";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  getPossibleDuplicates,
  markDuplicateGroupReviewed,
  type DuplicateConfidence,
  type DuplicateGroupClient,
} from "@/lib/api/duplicates";
import { cn } from "@/lib/utils/cn";

const CONFIDENCE_STYLES: Record<
  DuplicateConfidence,
  { label: string; className: string }
> = {
  HIGH: {
    label: "High confidence",
    className: "bg-red-50 text-red-800 ring-red-100",
  },
  MEDIUM: {
    label: "Medium confidence",
    className: "bg-amber-50 text-amber-800 ring-amber-100",
  },
  LOW: {
    label: "Low confidence",
    className: "bg-[var(--surface-muted)] text-[var(--foreground)] ring-[var(--border)]",
  },
};

function formatWhen(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function VisitorDuplicateCard({
  visitor,
  onOpenVisitor360,
}: {
  visitor: DuplicateGroupClient["visitors"][number];
  onOpenVisitor360: (visitorId: string) => void;
}) {
  const name = `${visitor.firstName} ${visitor.lastName}`;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--card)] ring-1 ring-[var(--border)]">
          {visitor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visitor.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-5 w-5 text-[var(--muted)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{name}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
            {visitor.email ?? "No email"} · {visitor.phone ?? "No phone"}
          </p>
          <p className="truncate text-xs text-[var(--muted)]">
            {visitor.company ?? "No company"}
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {visitor.visitCount} visit{visitor.visitCount === 1 ? "" : "s"} · Last{" "}
            {formatWhen(visitor.lastVisitAt)}
          </p>
        </div>
      </div>
      <div className="mt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={receptionCompactButton}
          onClick={() => onOpenVisitor360(visitor.id)}
        >
          Open Visitor 360
        </Button>
      </div>
    </div>
  );
}

export const DuplicateReviewPanel = memo(function DuplicateReviewPanel({
  refreshNonce = 0,
  onOpenVisitor360,
}: {
  refreshNonce?: number;
  onOpenVisitor360: (visitorId: string) => void;
}) {
  const [groups, setGroups] = useState<DuplicateGroupClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);

  const loadDuplicates = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getPossibleDuplicates({ limit: 25 });
      setGroups(data.duplicates);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load possible duplicates.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDuplicates();
  }, [loadDuplicates, refreshNonce]);

  const handleMarkReviewed = useCallback(
    async (group: DuplicateGroupClient) => {
      setReviewingKey(group.groupKey);

      try {
        await markDuplicateGroupReviewed({
          visitorIds: group.visitors.map((visitor) => visitor.id),
          confidence: group.confidence,
        });
        setGroups((current) =>
          current.filter((entry) => entry.groupKey !== group.groupKey),
        );
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not mark duplicate group as reviewed.",
        );
      } finally {
        setReviewingKey(null);
      }
    },
    [],
  );

  const highCount = groups.filter((group) => group.confidence === "HIGH").length;
  const mediumCount = groups.filter((group) => group.confidence === "MEDIUM").length;
  const lowCount = groups.filter((group) => group.confidence === "LOW").length;

  return (
    <section className={receptionCard}>
      <button
        type="button"
        className={cn(receptionCardHeader, "flex w-full items-start justify-between gap-2 text-left")}
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--muted)]">
            <Copy className="h-4 w-4" />
          </div>
          <div>
            <h2 className={receptionCardTitle}>Possible duplicates</h2>
            <p className={receptionCardSubtitle}>
              Review likely duplicate visitor records — visibility only, no merges
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-[var(--muted)] transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <div className={cn(receptionCardBody, "space-y-3")}>
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-md bg-[var(--surface-muted)]" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="rounded-md border border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
              No possible duplicate groups detected
            </p>
          ) : (
            <>
              <p className="text-[11px] text-[var(--muted)]">
                {highCount} high · {mediumCount} medium · {lowCount} low confidence
              </p>
              <div className="space-y-3">
                {groups.map((group) => {
                  const style = CONFIDENCE_STYLES[group.confidence];

                  return (
                    <article
                      key={group.groupKey}
                      className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                              style.className,
                            )}
                          >
                            {style.label}
                          </span>
                          <p className="mt-2 text-xs text-[var(--muted)]">
                            {group.reasons.join(" · ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={receptionCompactButton}
                          disabled={reviewingKey === group.groupKey}
                          onClick={() => void handleMarkReviewed(group)}
                        >
                          Mark reviewed
                        </Button>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {group.visitors.map((visitor) => (
                          <VisitorDuplicateCard
                            key={visitor.id}
                            visitor={visitor}
                            onOpenVisitor360={onOpenVisitor360}
                          />
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={receptionCardBody}>
          <p className="text-xs text-[var(--muted)]">
            {loading
              ? "Checking for duplicates…"
              : groups.length === 0
                ? "No duplicate groups found"
                : `${groups.length} possible duplicate group${groups.length === 1 ? "" : "s"} — expand to review`}
          </p>
        </div>
      )}
    </section>
  );
});
