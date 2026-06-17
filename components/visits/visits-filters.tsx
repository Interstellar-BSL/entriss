"use client";

import { VisitStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { BranchOption } from "@/lib/visits/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: VisitStatus.PENDING, label: "Pending approval" },
  { value: VisitStatus.APPROVED, label: "Approved" },
  { value: VisitStatus.CHECKED_IN, label: "Checked in" },
  { value: VisitStatus.CHECKED_OUT, label: "Checked out" },
  { value: VisitStatus.REJECTED, label: "Rejected" },
  { value: VisitStatus.CANCELLED, label: "Cancelled" },
] as const;

const selectClassName = cn(
  "h-10 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] shadow-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1",
);

export interface VisitsFilterState {
  search: string;
  status: string;
  branchId: string;
  dateFrom: string;
  dateTo: string;
}

export function VisitsFilters({
  filters,
  branches,
  branchesLoading,
  onChange,
}: {
  filters: VisitsFilterState;
  branches: BranchOption[];
  branchesLoading?: boolean;
  onChange: (patch: Partial<VisitsFilterState>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-3">
      <Input
        type="search"
        placeholder="Search visitor, company, or host…"
        value={filters.search}
        onChange={(event) => onChange({ search: event.target.value })}
        className="max-w-md"
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value })}
          className={selectClassName}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by branch"
          value={filters.branchId}
          onChange={(event) => onChange({ branchId: event.target.value })}
          className={selectClassName}
          disabled={branchesLoading}
        >
          <option value="">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          aria-label="From date"
          value={filters.dateFrom}
          onChange={(event) => onChange({ dateFrom: event.target.value })}
          className={selectClassName}
        />

        <input
          type="date"
          aria-label="To date"
          value={filters.dateTo}
          onChange={(event) => onChange({ dateTo: event.target.value })}
          className={selectClassName}
        />

        {(filters.status ||
          filters.branchId ||
          filters.dateFrom ||
          filters.dateTo ||
          filters.search) && (
          <button
            type="button"
            onClick={() =>
              onChange({
                search: "",
                status: "",
                branchId: "",
                dateFrom: "",
                dateTo: "",
              })
            }
            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
