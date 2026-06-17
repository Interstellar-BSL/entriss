"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { DataTablePagination } from "@/components/data-table/pagination";
import { CreateVisitorModal } from "@/components/visitors/create-visitor-modal";
import { VisitorProfileDrawer } from "@/components/visitors/visitor-profile-drawer";
import { VisitorsTable, type VisitorRow } from "@/components/visitors/visitors-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import {
  enrichVisitorsWithVisitStats,
  fetchVisitorVisitStats,
  listVisitors,
  type VisitorRecord,
} from "@/lib/api/visitors";
import { detachVisitorRecord } from "@/lib/visits/detach";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

function toVisitorRow(
  visitor: VisitorRecord,
  options?: { statsLoading?: boolean },
): VisitorRow {
  return {
    ...detachVisitorRecord(visitor),
    statsLoading: options?.statsLoading ?? false,
  };
}

function mergeVisitStats(
  rows: VisitorRow[],
  statsByVisitorId: Map<string, VisitorRow["visitStats"]>,
): VisitorRow[] {
  return rows.map((row) => {
    const visitStats = statsByVisitorId.get(row.id);

    return {
      ...row,
      ...(visitStats
        ? { visitStats, statsLoading: false }
        : { statsLoading: row.statsLoading ?? false }),
    };
  });
}

export function VisitorsPage() {
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadVisitors = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * PAGE_SIZE;
      const result = await listVisitors({
        limit: PAGE_SIZE,
        offset,
        search: searchQuery || undefined,
      });

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      const rows = result.items.map((visitor) =>
        toVisitorRow(visitor, { statsLoading: true }),
      );

      setVisitors(rows);
      setTotal(result.pagination.total);
      setLoading(false);
      setStatsLoading(true);

      const statsByVisitorId = await enrichVisitorsWithVisitStats(result.items);

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setVisitors((current) => mergeVisitStats(current, statsByVisitorId));
      setStatsLoading(false);
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load visitors. Please try again.",
      );
      setLoading(false);
      setStatsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    void loadVisitors();
  }, [loadVisitors]);

  function openVisitor(visitor: VisitorRecord) {
    setSelectedVisitor(detachVisitorRecord(visitor));
    setDrawerOpen(true);
  }

  function handleCreated(rawVisitor: VisitorRecord, created: boolean) {
    const newVisitor = detachVisitorRecord(rawVisitor);
    if (searchQuery) {
      setSearchInput("");
      setSearchQuery("");
      setPage(1);
      return;
    }

    if (page !== 1) {
      setPage(1);
      return;
    }

    let shouldIncrementTotal = created;

    setVisitors((prev) => {
      const existing = prev.find((visitor) => visitor.id === newVisitor.id);
      if (existing) {
        shouldIncrementTotal = false;
        return prev.map((visitor) =>
          visitor.id === newVisitor.id
            ? {
                ...toVisitorRow(newVisitor, { statsLoading: !visitor.visitStats }),
                visitStats: visitor.visitStats,
              }
            : visitor,
        );
      }

      return [toVisitorRow(newVisitor, { statsLoading: true }), ...prev];
    });

    if (shouldIncrementTotal) {
      setTotal((currentTotal) => currentTotal + 1);
    }

    void fetchVisitorVisitStats(newVisitor.id).then((visitStats) => {
      setVisitors((prev) =>
        prev.map((visitor) =>
          visitor.id === newVisitor.id
            ? { ...visitor, visitStats, statsLoading: false }
            : visitor,
        ),
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Visitors
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage visitor profiles and view visit history
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/visits/new">
            <Button type="button">Schedule visit</Button>
          </Link>
          <Button type="button" variant="secondary" onClick={() => setModalOpen(true)}>
            Add profile
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <Input
              type="search"
              placeholder="Search by name, email, or company…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <div className="px-4 py-6">
              <TableSkeleton />
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorState message={error} onRetry={() => void loadVisitors()} />
            </div>
          ) : visitors.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={searchQuery ? "No visitors found" : "No visitors yet"}
                description={
                  searchQuery
                    ? "Try adjusting your search terms."
                    : "Schedule a visit to register a visitor entry."
                }
                action={
                  !searchQuery ? (
                    <Link href="/visits/new">
                      <Button type="button">Schedule visit</Button>
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <VisitorsTable
                visitors={visitors}
                onRowClick={openVisitor}
                handlers={{ onView: openVisitor }}
              />
              {statsLoading ? (
                <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
                  Loading visit stats…
                </p>
              ) : null}
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

      <VisitorProfileDrawer
        visitor={selectedVisitor}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <CreateVisitorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
