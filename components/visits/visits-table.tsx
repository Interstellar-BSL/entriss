"use client";

import { memo } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/ui/badge";
import {
  VisitRowActions,
  type VisitActionHandlers,
} from "@/components/visits/visit-row-actions";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { kioskHostLabel } from "@/lib/kiosk/visit-display";

function formatDateTime(value: Date | string | null | undefined) {
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

function getScheduledTime(visit: VisitWithRelations) {
  return visit.scheduledAt ?? visit.checkedInAt ?? null;
}

export const VisitsTable = memo(function VisitsTable({
  visits,
  onRowClick,
  handlers,
  busyAction,
}: {
  visits: VisitWithRelations[];
  onRowClick: (visit: VisitWithRelations) => void;
  handlers: VisitActionHandlers;
  busyAction?: string | null;
}) {
  const columns: DataTableColumn<VisitWithRelations>[] = [
    {
      id: "visitor",
      header: "Visitor",
      cell: (row) => (
        <div>
          <span className="font-medium text-[var(--foreground)]">
            {row.visitor.firstName} {row.visitor.lastName}
          </span>
          {row.visitor.email ? (
            <p className="mt-0.5 text-xs text-[var(--muted)] md:hidden">
              {row.visitor.email}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "company",
      header: "Company",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-[var(--muted)]">{row.visitor.company ?? "—"}</span>
      ),
    },
    {
      id: "host",
      header: "Host",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-[var(--muted)]">
          {kioskHostLabel(row)}
        </span>
      ),
    },
    {
      id: "branch",
      header: "Branch",
      hideOnMobile: true,
      cell: (row) => <span className="text-[var(--muted)]">{row.branch.name}</span>,
    },
    {
      id: "purpose",
      header: "Purpose",
      hideOnMobile: true,
      cell: (row) => (
        <span className="line-clamp-1 max-w-[12rem] text-[var(--muted)]">
          {row.purpose ?? "—"}
        </span>
      ),
    },
    {
      id: "scheduled",
      header: "Scheduled",
      cell: (row) => (
        <span className="text-[var(--muted)]">{formatDateTime(getScheduledTime(row))}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      className: "w-44 text-right",
      cell: (row) => (
        <VisitRowActions
          visit={row}
          handlers={handlers}
          busyAction={busyAction}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={visits}
      keyExtractor={(row) => row.id}
      onRowClick={onRowClick}
    />
  );
});
