"use client";

import { memo, useCallback, useEffect, useState } from "react";

import {
  receptionCard,
  receptionCardBody,
  receptionCardHeader,
  receptionCardSubtitle,
  receptionCardTitle,
  receptionRowButton,
  receptionSectionLabel,
} from "@/components/reception/reception-ui";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { listVisits, searchVisits } from "@/lib/api/visits";
import { VisitStatus } from "@prisma/client";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { kioskHostLabel } from "@/lib/kiosk/visit-display";
import { cn } from "@/lib/utils/cn";

const SEARCH_DEBOUNCE_MS = 300;

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
}

function formatWhen(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const LookupRow = memo(function LookupRow({
  visit,
  selected,
  onSelect,
}: {
  visit: VisitWithRelations;
  selected: boolean;
  onSelect: (visit: VisitWithRelations) => void;
}) {
  const name = `${visit.visitor.firstName} ${visit.visitor.lastName}`;

  return (
    <button
      type="button"
      className={cn(
        receptionRowButton("items-center justify-between gap-3"),
        selected && "bg-[var(--surface-muted)]",
      )}
      onClick={() => onSelect(visit)}
    >
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm font-medium text-[var(--foreground)]">
          {name}
        </span>
        <span className="block truncate text-xs text-[var(--muted)]">
          {visit.visitor.company ?? "—"} ·{" "}
          {kioskHostLabel(visit)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={visit.status} />
        <span className="text-[11px] tabular-nums text-[var(--muted)]">
          {formatWhen(visit.scheduledAt ?? visit.checkedInAt)}
        </span>
      </span>
    </button>
  );
});

export const ReceptionManualLookup = memo(function ReceptionManualLookup({
  searchInputRef,
  focusSearchNonce,
  todayOnly,
  statusFilter,
  selectedVisitId,
  onSelectVisit,
  onOpenVisit,
}: {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  focusSearchNonce?: number;
  todayOnly?: boolean;
  statusFilter?: VisitStatus | "";
  selectedVisitId?: string | null;
  onSelectVisit: (visit: VisitWithRelations) => void;
  onOpenVisit: (visit: VisitWithRelations, tab?: "overview" | "approval") => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [visits, setVisits] = useState<VisitWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (focusSearchNonce === undefined) {
      return;
    }
    searchInputRef.current?.focus();
  }, [focusSearchNonce, searchInputRef]);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (debouncedQuery) {
        const criteria = debouncedQuery.includes("@")
          ? { email: debouncedQuery }
          : /^\+?[\d\s()-]{5,}$/.test(debouncedQuery)
            ? { phone: debouncedQuery }
            : { name: debouncedQuery };

        const result = await searchVisits(criteria);
        setVisits(result.visits.slice(0, 12));
        return;
      }

      if (todayOnly) {
        const result = await listVisits({
          ...getTodayRange(),
          limit: 12,
          ...(statusFilter ? { status: statusFilter } : {}),
        });
        setVisits(result.items);
        return;
      }

      if (statusFilter) {
        const result = await listVisits({
          status: statusFilter,
          limit: 12,
        });
        setVisits(result.items);
        return;
      }

      setVisits([]);
    } catch (err) {
      setVisits([]);
      setError(err instanceof ApiError ? err.message : "Could not load visits.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, statusFilter, todayOnly]);

  useEffect(() => {
    void loadVisits();
  }, [loadVisits]);

  return (
    <section className={receptionCard}>
      <div className={receptionCardHeader}>
        <h2 className={receptionCardTitle}>Visitor lookup</h2>
        <p className={receptionCardSubtitle}>
          Search by name, email, or phone — click a row to select
        </p>
      </div>
      <div className={cn(receptionCardBody, "space-y-3")}>
        <Input
          ref={searchInputRef}
          type="search"
          placeholder="Search visitors…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-8 max-w-md text-sm"
        />

        {todayOnly ? (
          <p className={receptionSectionLabel}>Showing today&apos;s arrivals</p>
        ) : null}
        {statusFilter === VisitStatus.PENDING ? (
          <p className={receptionSectionLabel}>Pending approvals</p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded-md bg-[var(--surface-muted)]"
              />
            ))}
          </div>
        ) : null}

        {!loading && visits.length === 0 ? (
          <p className="rounded-md border border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
            {debouncedQuery || todayOnly || statusFilter
              ? "No matching visits found."
              : "Search or use a fast action to load visits."}
          </p>
        ) : null}

        {!loading && visits.length > 0 ? (
          <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
            {visits.map((visit) => (
              <LookupRow
                key={visit.id}
                visit={visit}
                selected={selectedVisitId === visit.id}
                onSelect={onSelectVisit}
              />
            ))}
          </div>
        ) : null}

        {selectedVisitId ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs font-medium text-[var(--link)] hover:text-[var(--brand-primary-hover)]"
              onClick={() => {
                const visit = visits.find((item) => item.id === selectedVisitId);
                if (visit) {
                  onOpenVisit(
                    visit,
                    statusFilter === VisitStatus.PENDING ? "approval" : "overview",
                  );
                }
              }}
            >
              Open visit details →
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
});
