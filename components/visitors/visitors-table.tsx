"use client";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import {
  VisitorRowActions,
  type VisitorActionHandlers,
} from "@/components/visitors/visitor-row-actions";
import type { VisitorRecord, VisitorVisitStats } from "@/lib/api/visitors";

export interface VisitorRow extends VisitorRecord {
  visitStats?: VisitorVisitStats;
  statsLoading?: boolean;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function VisitorStatusBadge({ isActive }: { isActive?: boolean }) {
  const active = isActive !== false;
  return (
    <span
      className={
        active
          ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 ring-inset"
          : "inline-flex rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted)] ring-1 ring-[var(--border)] ring-inset"
      }
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function VisitorsTable({
  visitors,
  onRowClick,
  handlers,
}: {
  visitors: VisitorRow[];
  onRowClick: (visitor: VisitorRow) => void;
  handlers: VisitorActionHandlers;
}) {
  const columns: DataTableColumn<VisitorRow>[] = [
    {
      id: "name",
      header: "Name",
      cell: (row) => (
        <span className="font-medium text-[var(--foreground)]">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      id: "email",
      header: "Email",
      hideOnMobile: true,
      cell: (row) => <span className="text-[var(--muted)]">{row.email ?? "—"}</span>,
    },
    {
      id: "phone",
      header: "Phone",
      hideOnMobile: true,
      cell: (row) => <span className="text-[var(--muted)]">{row.phone ?? "—"}</span>,
    },
    {
      id: "company",
      header: "Company",
      hideOnMobile: true,
      cell: (row) => <span className="text-[var(--muted)]">{row.company ?? "—"}</span>,
    },
    {
      id: "visitCount",
      header: "Visits",
      className: "w-20",
      cell: (row) =>
        row.statsLoading ? (
          <span className="text-[var(--muted)]">…</span>
        ) : (
          <span className="text-[var(--muted)]">{row.visitStats?.visitCount ?? 0}</span>
        ),
    },
    {
      id: "lastVisit",
      header: "Last visit",
      hideOnMobile: true,
      cell: (row) =>
        row.statsLoading ? (
          <span className="text-[var(--muted)]">…</span>
        ) : (
          <span className="text-[var(--muted)]">
            {formatDate(row.visitStats?.lastVisitAt)}
          </span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <VisitorStatusBadge isActive={row.isActive} />,
    },
    {
      id: "actions",
      header: "",
      className: "w-20 text-right",
      cell: (row) => <VisitorRowActions visitor={row} handlers={handlers} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={visitors}
      keyExtractor={(row) => row.id}
      onRowClick={onRowClick}
    />
  );
}
