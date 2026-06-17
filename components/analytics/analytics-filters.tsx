"use client";

import { cn } from "@/lib/utils/cn";
import type { AnalyticsPeriod } from "@/lib/analytics/date-ranges";
import type { BranchSummary } from "@/lib/api/branches";

const selectClassName = cn(
  "h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] shadow-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1",
);

export interface AnalyticsFilterState {
  period: AnalyticsPeriod;
  dateFrom: string;
  dateTo: string;
  branchId: string;
  hostId: string;
  category: string;
}

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilterState = {
  period: "monthly",
  dateFrom: "",
  dateTo: "",
  branchId: "",
  hostId: "",
  category: "",
};

export function AnalyticsFilters({
  filters,
  branches,
  branchesLoading,
  showHostFilter = false,
  hosts = [],
  showCategoryFilter = false,
  onChange,
}: {
  filters: AnalyticsFilterState;
  branches: BranchSummary[];
  branchesLoading?: boolean;
  showHostFilter?: boolean;
  hosts?: Array<{ hostId: string; hostName: string }>;
  showCategoryFilter?: boolean;
  onChange: (patch: Partial<AnalyticsFilterState>) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      <label className="space-y-1">
        <span className="block text-[11px] font-medium text-[var(--muted)]">Period</span>
        <select
          aria-label="Analytics period"
          value={filters.period}
          onChange={(event) =>
            onChange({ period: event.target.value as AnalyticsPeriod })
          }
          className={selectClassName}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      {filters.period === "custom" ? (
        <>
          <label className="space-y-1">
            <span className="block text-[11px] font-medium text-[var(--muted)]">From</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => onChange({ dateFrom: event.target.value })}
              className={selectClassName}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] font-medium text-[var(--muted)]">To</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => onChange({ dateTo: event.target.value })}
              className={selectClassName}
            />
          </label>
        </>
      ) : null}

      <label className="space-y-1">
        <span className="block text-[11px] font-medium text-[var(--muted)]">Branch</span>
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
      </label>

      {showHostFilter ? (
        <label className="space-y-1">
          <span className="block text-[11px] font-medium text-[var(--muted)]">Host</span>
          <select
            aria-label="Filter by host"
            value={filters.hostId}
            onChange={(event) => onChange({ hostId: event.target.value })}
            className={selectClassName}
          >
            <option value="">All hosts</option>
            {hosts.map((host) => (
              <option key={host.hostId} value={host.hostId}>
                {host.hostName}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showCategoryFilter ? (
        <label className="space-y-1">
          <span className="block text-[11px] font-medium text-[var(--muted)]">Category</span>
          <select
            aria-label="Filter by activity category"
            value={filters.category}
            onChange={(event) => onChange({ category: event.target.value })}
            className={selectClassName}
          >
            <option value="">All categories</option>
            <option value="visit">Visit</option>
            <option value="approval">Approval</option>
            <option value="security">Security</option>
            <option value="identity">Identity</option>
            <option value="settings">Settings</option>
            <option value="system">System</option>
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function toAnalyticsQueryParams(filters: AnalyticsFilterState) {
  return {
    period: filters.period,
    dateFrom: filters.period === "custom" ? filters.dateFrom || undefined : undefined,
    dateTo: filters.period === "custom" ? filters.dateTo || undefined : undefined,
    branchId: filters.branchId || undefined,
    hostId: filters.hostId || undefined,
    category: filters.category || undefined,
  };
}
