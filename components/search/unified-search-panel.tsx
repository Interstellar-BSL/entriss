"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { Search, UserRound } from "lucide-react";

import { ListSkeleton } from "@/components/shared/loading-state";
import {
  receptionCard,
  receptionCardBody,
  receptionCardHeader,
  receptionCardSubtitle,
  receptionCardTitle,
  receptionCompactButton,
  receptionRowButton,
  receptionSectionLabel,
} from "@/components/reception/reception-ui";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { VisitorTagBadges } from "@/components/visitors/visitor-tag-badges";
import { VisitorTypeBadge } from "@/components/visitors/visitor-type-badge";
import { ReceptionVisitQuickActions } from "@/components/reception/reception-visit-quick-actions";
import { ApiError } from "@/lib/api/client";
import {
  searchUnified,
  type UnifiedSearchCheckedInResult,
  type UnifiedSearchData,
  type UnifiedSearchVisitResult,
  type UnifiedSearchVisitorResult,
} from "@/lib/api/search";
import { listVisits } from "@/lib/api/visits";
import { VisitStatus } from "@/app/generated/prisma/enums";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { resolveHostDisplayName } from "@/lib/hosts/display";
import { cn } from "@/lib/utils/cn";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

type PresetMode = "today" | "approvals" | null;

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

function formatWhen(value: string | null | undefined) {
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

function formatDuration(minutes: number | null) {
  if (minutes === null) {
    return "—";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainder} min`;
}

function mapListVisitToSearchVisit(
  visit: VisitWithRelations,
): UnifiedSearchVisitResult {
  return {
    id: visit.id,
    status: visit.status as UnifiedSearchVisitResult["status"],
    purpose: visit.purpose ?? null,
    scheduledAt: visit.scheduledAt ? String(visit.scheduledAt) : null,
    visitor: {
      id: visit.visitor.id,
      firstName: visit.visitor.firstName,
      lastName: visit.visitor.lastName,
    },
    host: {
      id: visit.host.id,
      name: resolveHostDisplayName(visit.host),
    },
    branch: {
      id: visit.branch.id,
      name: visit.branch.name,
    },
    matchTier: 9,
  };
}

const VisitorResultCard = memo(function VisitorResultCard({
  visitor,
  selected,
  onSelect,
  onOpenVisitor360,
}: {
  visitor: UnifiedSearchVisitorResult;
  selected: boolean;
  onSelect: (visitor: UnifiedSearchVisitorResult) => void;
  onOpenVisitor360?: (visitorId: string) => void;
}) {
  const fullName = `${visitor.firstName} ${visitor.lastName}`;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        className={cn(
          receptionRowButton("items-start gap-3"),
          selected && "bg-[var(--surface-muted)]",
        )}
        onClick={() => onSelect(visitor)}
      >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
        {visitor.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={visitor.photoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound className="h-4 w-4" strokeWidth={1.75} />
        )}
      </div>

      <span className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">{fullName}</span>
          <VisitorTypeBadge type={visitor.visitorType} />
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
          {visitor.email ?? "No email"} · {visitor.phone ?? "No phone"}
        </span>
        <VisitorTagBadges tags={visitor.tags} className="mt-1.5" />
        <span className="mt-1 block text-[11px] text-[var(--muted)]">
          Last visit {formatWhen(visitor.lastVisitAt)}
        </span>
      </span>
      </button>
      {onOpenVisitor360 ? (
        <div
          className="px-2 pb-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={receptionCompactButton}
            onClick={() => onOpenVisitor360(visitor.id)}
          >
            Visitor 360
          </Button>
        </div>
      ) : null}
    </div>
  );
});

const VisitResultCard = memo(function VisitResultCard({
  visit,
  selected,
  busy,
  onSelect,
  onCheckIn,
  onCheckOut,
  onPrintBadge,
  onOpenVisitor360,
  onOpenVisitDetails,
}: {
  visit: UnifiedSearchVisitResult;
  selected: boolean;
  busy: boolean;
  onSelect: (visit: UnifiedSearchVisitResult) => void;
  onCheckIn: (visitId: string) => void;
  onCheckOut: (visitId: string) => void;
  onPrintBadge: (visitId: string) => void;
  onOpenVisitor360: (visitorId: string) => void;
  onOpenVisitDetails: (visitId: string) => void;
}) {
  const visitorName = `${visit.visitor.firstName} ${visit.visitor.lastName}`;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
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
          {visitorName}
        </span>
        <span className="block truncate text-xs text-[var(--muted)]">
          {visit.branch.name} · {visit.host.name}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
          Visit {visit.id.slice(0, 10)}…
          {visit.purpose ? ` · ${visit.purpose}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={visit.status} />
        <span className="text-[11px] tabular-nums text-[var(--muted)]">
          {formatWhen(visit.scheduledAt)}
        </span>
      </span>
      </button>
      <div className="px-2 pb-2">
        <ReceptionVisitQuickActions
          visitId={visit.id}
          visitorId={visit.visitor.id}
          status={visit.status}
          busy={busy}
          compact
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
          onPrintBadge={onPrintBadge}
          onOpenVisitor360={onOpenVisitor360}
          onOpenVisitDetails={onOpenVisitDetails}
        />
      </div>
    </div>
  );
});

const CheckedInResultCard = memo(function CheckedInResultCard({
  entry,
  selected,
  busy,
  onSelect,
  onCheckIn,
  onCheckOut,
  onPrintBadge,
  onOpenVisitor360,
  onOpenVisitDetails,
}: {
  entry: UnifiedSearchCheckedInResult;
  selected: boolean;
  busy: boolean;
  onSelect: (entry: UnifiedSearchCheckedInResult) => void;
  onCheckIn: (visitId: string) => void;
  onCheckOut: (visitId: string) => void;
  onPrintBadge: (visitId: string) => void;
  onOpenVisitor360: (visitorId: string) => void;
  onOpenVisitDetails: (visitId: string) => void;
}) {
  const visitorName = `${entry.visitor.firstName} ${entry.visitor.lastName}`;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        className={cn(
          receptionRowButton("items-start gap-3"),
          selected && "bg-[var(--surface-muted)]",
        )}
        onClick={() => onSelect(entry)}
      >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-emerald-700">
        {entry.visitor.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.visitor.photoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound className="h-4 w-4" strokeWidth={1.75} />
        )}
      </div>

      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium text-[var(--foreground)]">
          {visitorName}
        </span>
        <span className="block truncate text-xs text-[var(--muted)]">
          Host {entry.host.name} · {entry.branch.name}
        </span>
        <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
          Checked in {formatWhen(entry.checkedInAt)} · On-site{" "}
          {formatDuration(entry.durationMinutes)}
        </span>
      </span>
      </button>
      <div className="px-2 pb-2">
        <ReceptionVisitQuickActions
          visitId={entry.visitId}
          visitorId={entry.visitor.id}
          status={VisitStatus.CHECKED_IN}
          busy={busy}
          compact
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
          onPrintBadge={onPrintBadge}
          onOpenVisitor360={onOpenVisitor360}
          onOpenVisitDetails={onOpenVisitDetails}
        />
      </div>
    </div>
  );
});

function ResultSection({
  title,
  children,
  emptyMessage,
}: {
  title: string;
  children: React.ReactNode;
  emptyMessage?: string;
}) {
  return (
    <section className="space-y-2">
      <p className={receptionSectionLabel}>{title}</p>
      {children}
      {emptyMessage ? (
        <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-3 text-center text-xs text-[var(--muted)]">
          {emptyMessage}
        </p>
      ) : null}
    </section>
  );
}

export const UnifiedSearchPanel = memo(function UnifiedSearchPanel({
  searchInputRef,
  focusSearchNonce,
  presetMode = null,
  selectedVisitId,
  busyVisitId = null,
  onSelectVisit,
  onOpenSelectedVisit,
  onSelectVisitor,
  onOpenVisitor360,
  onCheckIn,
  onCheckOut,
  onPrintBadge,
  onOpenVisitDetails,
}: {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  focusSearchNonce?: number;
  presetMode?: PresetMode;
  selectedVisitId?: string | null;
  busyVisitId?: string | null;
  onSelectVisit: (visit: VisitWithRelations) => void;
  onOpenVisit?: (visit: VisitWithRelations, tab?: "overview" | "approval") => void;
  onOpenSelectedVisit?: () => void;
  onSelectVisitor?: (visitor: UnifiedSearchVisitorResult) => void;
  onOpenVisitor360: (visitorId: string) => void;
  onCheckIn: (visitId: string) => void;
  onCheckOut: (visitId: string) => void;
  onPrintBadge: (visitId: string) => void;
  onOpenVisitDetails: (visitId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchData>({
    visitors: [],
    visits: [],
    checkedIn: [],
  });
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

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (debouncedQuery.length >= MIN_QUERY_LENGTH) {
        const data = await searchUnified(debouncedQuery);
        setResults(data);
        return;
      }

      if (presetMode === "today") {
        const response = await listVisits({
          ...getTodayRange(),
          limit: 20,
        });
        setResults({
          visitors: [],
          visits: response.items.map(mapListVisitToSearchVisit),
          checkedIn: response.items
            .filter((visit) => visit.status === VisitStatus.CHECKED_IN)
            .map((visit) => ({
              visitId: visit.id,
              visitor: {
                id: visit.visitor.id,
                firstName: visit.visitor.firstName,
                lastName: visit.visitor.lastName,
                photoUrl: visit.visitor.photoUrl ?? null,
              },
              host: {
                id: visit.host.id,
                name: resolveHostDisplayName(visit.host),
              },
              branch: {
                id: visit.branch.id,
                name: visit.branch.name,
              },
              checkedInAt: String(visit.checkedInAt ?? new Date().toISOString()),
              durationMinutes: visit.checkedInAt
                ? Math.round(
                    (Date.now() - new Date(visit.checkedInAt).getTime()) /
                      60_000,
                  )
                : null,
              matchTier: 9,
            })),
        });
        return;
      }

      if (presetMode === "approvals") {
        const response = await listVisits({
          status: VisitStatus.PENDING,
          limit: 20,
        });
        setResults({
          visitors: [],
          visits: response.items.map(mapListVisitToSearchVisit),
          checkedIn: [],
        });
        return;
      }

      setResults({ visitors: [], visits: [], checkedIn: [] });
    } catch (err) {
      setResults({ visitors: [], visits: [], checkedIn: [] });
      setError(err instanceof ApiError ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, presetMode]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  const hasResults =
    results.visitors.length > 0 ||
    results.visits.length > 0 ||
    results.checkedIn.length > 0;

  const handleSelectVisitResult = useCallback(
    (visit: UnifiedSearchVisitResult) => {
      const mapped: VisitWithRelations = {
        id: visit.id,
        organizationId: "",
        branchId: visit.branch.id,
        visitorId: visit.visitor.id,
        hostMemberId: visit.host.id,
        status: visit.status,
        purpose: visit.purpose,
        scheduledAt: visit.scheduledAt ? new Date(visit.scheduledAt) : null,
        checkedInAt: null,
        checkedOutAt: null,
        checkedInById: null,
        checkedOutById: null,
        qrToken: null,
        qrExpiresAt: null,
        badgeNumber: null,
        visitor: {
          id: visit.visitor.id,
          firstName: visit.visitor.firstName,
          lastName: visit.visitor.lastName,
          email: null,
          phone: null,
          company: null,
          photoUrl: null,
        },
        branch: {
          id: visit.branch.id,
          name: visit.branch.name,
          slug: "",
          code: null,
          timezone: "UTC",
          requiresApproval: false,
          autoCheckoutHours: null,
        },
        host: {
          id: visit.host.id,
          userId: "",
          user: {
            id: "",
            name: visit.host.name,
            email: visit.host.name,
          },
        },
        organization: {
          id: "",
          name: "",
          slug: "",
          logoUrl: null,
          settings: {},
        },
      };

      onSelectVisit(mapped);
    },
    [onSelectVisit],
  );

  const handleSelectCheckedIn = useCallback(
    (entry: UnifiedSearchCheckedInResult) => {
      handleSelectVisitResult({
        id: entry.visitId,
        status: VisitStatus.CHECKED_IN,
        purpose: null,
        scheduledAt: null,
        visitor: entry.visitor,
        host: entry.host,
        branch: entry.branch,
        matchTier: entry.matchTier,
      });
    },
    [handleSelectVisitResult],
  );

  return (
    <section className={receptionCard}>
      <div className={receptionCardHeader}>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[var(--muted)]" aria-hidden />
          <h2 className={receptionCardTitle}>Operator search</h2>
        </div>
        <p className={receptionCardSubtitle}>
          Search visitors, visits, hosts, tags, notes, QR references, and more
        </p>
      </div>

      <div className={cn(receptionCardBody, "space-y-4")}>
        <Input
          ref={searchInputRef}
          type="search"
          placeholder="Search by name, email, phone, visit ID, host, tag…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-9 text-sm"
        />

        {presetMode === "today" && debouncedQuery.length < MIN_QUERY_LENGTH ? (
          <p className={receptionSectionLabel}>Showing today&apos;s arrivals</p>
        ) : null}
        {presetMode === "approvals" && debouncedQuery.length < MIN_QUERY_LENGTH ? (
          <p className={receptionSectionLabel}>Pending approvals</p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <ListSkeleton rows={4} />
        ) : null}

        {!loading &&
        debouncedQuery.length > 0 &&
        debouncedQuery.length < MIN_QUERY_LENGTH ? (
          <p className="rounded-md border border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
            Enter at least {MIN_QUERY_LENGTH} characters to search.
          </p>
        ) : null}

        {!loading &&
        !error &&
        debouncedQuery.length >= MIN_QUERY_LENGTH &&
        !hasResults ? (
          <p className="rounded-md border border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
            No matching visitors or visits found.
          </p>
        ) : null}

        {!loading && hasResults ? (
          <div className="space-y-4">
            {results.checkedIn.length > 0 ? (
              <ResultSection title="Currently checked in">
                <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
                  {results.checkedIn.map((entry) => (
                    <CheckedInResultCard
                      key={entry.visitId}
                      entry={entry}
                      selected={selectedVisitId === entry.visitId}
                      busy={busyVisitId === entry.visitId}
                      onSelect={handleSelectCheckedIn}
                      onCheckIn={onCheckIn}
                      onCheckOut={onCheckOut}
                      onPrintBadge={onPrintBadge}
                      onOpenVisitor360={onOpenVisitor360}
                      onOpenVisitDetails={onOpenVisitDetails}
                    />
                  ))}
                </div>
              </ResultSection>
            ) : null}

            {results.visitors.length > 0 ? (
              <ResultSection title="Visitors">
                <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
                  {results.visitors.map((visitor) => (
                    <VisitorResultCard
                      key={visitor.id}
                      visitor={visitor}
                      selected={false}
                      onSelect={(entry) => onSelectVisitor?.(entry)}
                      onOpenVisitor360={onOpenVisitor360}
                    />
                  ))}
                </div>
              </ResultSection>
            ) : null}

            {results.visits.length > 0 ? (
              <ResultSection title="Visits">
                <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
                  {results.visits.map((visit) => (
                    <VisitResultCard
                      key={visit.id}
                      visit={visit}
                      selected={selectedVisitId === visit.id}
                      busy={busyVisitId === visit.id}
                      onSelect={handleSelectVisitResult}
                      onCheckIn={onCheckIn}
                      onCheckOut={onCheckOut}
                      onPrintBadge={onPrintBadge}
                      onOpenVisitor360={onOpenVisitor360}
                      onOpenVisitDetails={onOpenVisitDetails}
                    />
                  ))}
                </div>
              </ResultSection>
            ) : null}
          </div>
        ) : null}

        {selectedVisitId ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs font-medium text-[var(--link)] hover:text-[var(--brand-primary-hover)]"
              onClick={() => onOpenSelectedVisit?.()}
            >
              Open visit details →
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
});
