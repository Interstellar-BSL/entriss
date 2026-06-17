"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DataTablePagination } from "@/components/data-table/pagination";
import { BadgePreviewModal } from "@/components/visits/badge-preview-modal";
import { QrCodeModal } from "@/components/visits/qr-code-modal";
import { VisitDetailsDrawer } from "@/components/visits/visit-details-drawer";
import {
  VisitsFilters,
  type VisitsFilterState,
} from "@/components/visits/visits-filters";
import { VisitsTable } from "@/components/visits/visits-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import {
  checkInVisit,
  checkOutVisit,
  listVisits,
  type ListVisitsParams,
} from "@/lib/api/visits";
import { extractBranchesFromVisits } from "@/lib/visits/branches";
import { detachVisitWithRelations } from "@/lib/visits/detach";
import { searchVisitsByVisitor } from "@/lib/visits/search-visits";
import type { BranchOption, ThermalBadgeData } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import type { VisitStatus } from "@prisma/client";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_FILTERS: VisitsFilterState = {
  search: "",
  status: "",
  branchId: "",
  dateFrom: "",
  dateTo: "",
};

function buildListParams(
  page: number,
  filters: VisitsFilterState,
): ListVisitsParams {
  const dateFrom = filters.dateFrom
    ? new Date(`${filters.dateFrom}T00:00:00`).toISOString()
    : undefined;
  const dateTo = filters.dateTo
    ? new Date(`${filters.dateTo}T23:59:59.999`).toISOString()
    : undefined;

  return {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    status: (filters.status as VisitStatus) || undefined,
    branchId: filters.branchId || undefined,
    dateFrom,
    dateTo,
  };
}

function hasActiveFilters(filters: VisitsFilterState) {
  return Boolean(
    filters.search ||
      filters.status ||
      filters.branchId ||
      filters.dateFrom ||
      filters.dateTo,
  );
}

export function VisitsPage() {
  const searchParams = useSearchParams();
  const [visits, setVisits] = useState<VisitWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<VisitsFilterState>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const [branches, setBranches] = useState<BranchOption[]>([]);

  const branchesLoading = loading && branches.length === 0;

  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState<
    "overview" | "approval" | "checkin" | "audit" | "activity"
  >("overview");

  const [qrVisit, setQrVisit] = useState<VisitWithRelations | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const [badgeVisit, setBadgeVisit] = useState<VisitWithRelations | null>(null);
  const [badgeInitial, setBadgeInitial] = useState<ThermalBadgeData | null>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const actionLockRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError(null);

    const listParams = buildListParams(page, {
      ...filters,
      search: searchQuery,
    });

    try {
      const result = searchQuery
        ? await searchVisitsByVisitor(searchQuery, listParams)
        : await listVisits(listParams);

      setVisits(result.items);
      setTotal(result.pagination.total);

      setBranches((current) => {
        const merged = new Map(current.map((branch) => [branch.id, branch]));
        for (const branch of extractBranchesFromVisits(result.items)) {
          merged.set(branch.id, branch);
        }
        return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load visits. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, filters, searchQuery]);

  useEffect(() => {
    void loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    const visitId = searchParams.get("visit");
    const tab = searchParams.get("tab");

    if (!visitId) {
      return;
    }

    setSelectedVisitId(visitId);
    setDrawerOpen(true);
    if (
      tab === "approval" ||
      tab === "checkin" ||
      tab === "audit" ||
      tab === "activity" ||
      tab === "overview"
    ) {
      setDrawerInitialTab(tab);
    } else {
      setDrawerInitialTab("overview");
    }
  }, [searchParams]);

  function handleFilterChange(patch: Partial<VisitsFilterState>) {
    if ("search" in patch && patch.search !== undefined) {
      setSearchInput(patch.search);
      return;
    }

    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  function openVisit(visit: VisitWithRelations) {
    setSelectedVisitId(visit.id);
    setDrawerInitialTab("overview");
    setDrawerOpen(true);
  }

  function patchVisitInList(updated: VisitWithRelations) {
    const nextVisit = detachVisitWithRelations(updated);
    setVisits((current) =>
      current.map((visit) => (visit.id === nextVisit.id ? nextVisit : visit)),
    );
  }

  function showToast(message: string) {
    setActionToast(message);
    window.setTimeout(() => setActionToast(null), 3000);
  }

  async function handleCheckIn(visit: VisitWithRelations) {
    if (actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setBusyAction(visit.id);

    try {
      const result = await checkInVisit(visit.id);
      patchVisitInList(result.visit);
      showToast(`${visit.visitor.firstName} checked in`);

      if (result.badge) {
        setBadgeVisit(result.visit);
        setBadgeInitial(result.badge);
        setBadgeModalOpen(true);
      }
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Check-in failed.",
      );
    } finally {
      actionLockRef.current = false;
      setBusyAction(null);
    }
  }

  async function handleCheckOut(visit: VisitWithRelations) {
    if (actionLockRef.current) {
      return;
    }

    actionLockRef.current = true;
    setBusyAction(visit.id);

    try {
      const result = await checkOutVisit(visit.id);
      patchVisitInList(result.visit);
      showToast(`${visit.visitor.firstName} checked out`);
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Check-out failed.",
      );
    } finally {
      actionLockRef.current = false;
      setBusyAction(null);
    }
  }

  function handleGenerateQr(visit: VisitWithRelations) {
    setQrVisit(visit);
    setQrModalOpen(true);
  }

  function handlePrintBadge(
    visit: VisitWithRelations,
    initialBadge?: ThermalBadgeData | null,
  ) {
    setBadgeVisit(visit);
    setBadgeInitial(initialBadge ?? null);
    setBadgeModalOpen(true);
  }

  function handleQrGenerated(visitId: string, token: string, expiresAt: string) {
    setVisits((current) =>
      current.map((visit) =>
        visit.id === visitId
          ? detachVisitWithRelations({
              ...visit,
              qrToken: token,
              qrExpiresAt: new Date(expiresAt),
            })
          : visit,
      ),
    );
  }

  const actionHandlers = useMemo(
    () => ({
      onView: openVisit,
      onCheckIn: (visit: VisitWithRelations) => void handleCheckIn(visit),
      onCheckOut: (visit: VisitWithRelations) => void handleCheckOut(visit),
      onGenerateQr: handleGenerateQr,
      onPrintBadge: (visit: VisitWithRelations) => handlePrintBadge(visit),
    }),
    // Handlers are stable enough for table memoization within a page session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyAction],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Visits
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage scheduled visits, check-ins, badges, and QR codes
          </p>
        </div>
        <Link href="/visits/new">
          <Button type="button">Schedule visit</Button>
        </Link>
      </div>

      {actionToast ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--foreground)] shadow-sm">
          {actionToast}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <VisitsFilters
            filters={{ ...filters, search: searchInput }}
            branches={branches}
            branchesLoading={branchesLoading}
            onChange={handleFilterChange}
          />

          {loading ? (
            <div className="px-4 py-6">
              <TableSkeleton />
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorState message={error} onRetry={() => void loadVisits()} />
            </div>
          ) : visits.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={hasActiveFilters({ ...filters, search: searchQuery })
                  ? "No visits found"
                  : "No visits yet"}
                description={
                  hasActiveFilters({ ...filters, search: searchQuery })
                    ? "Try adjusting your filters or search terms."
                    : "Schedule a visit to register a visitor entry."
                }
              />
            </div>
          ) : (
            <>
              <VisitsTable
                visits={visits}
                onRowClick={openVisit}
                handlers={actionHandlers}
                busyAction={busyAction}
              />
              <DataTablePagination
                total={total}
                limit={PAGE_SIZE}
                offset={(page - 1) * PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <VisitDetailsDrawer
        visitId={selectedVisitId}
        open={drawerOpen}
        initialTab={drawerInitialTab}
        onClose={() => setDrawerOpen(false)}
        onVisitUpdated={patchVisitInList}
        onGenerateQr={handleGenerateQr}
        onPrintBadge={handlePrintBadge}
      />

      <QrCodeModal
        visit={qrVisit}
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onGenerated={handleQrGenerated}
      />

      <BadgePreviewModal
        visit={badgeVisit}
        open={badgeModalOpen}
        onClose={() => {
          setBadgeModalOpen(false);
          setBadgeInitial(null);
        }}
        initialBadge={badgeInitial}
      />
    </div>
  );
}
