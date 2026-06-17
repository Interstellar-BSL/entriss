"use client";

import { useCallback, useState } from "react";

import {
  AnalyticsFilters,
  DEFAULT_ANALYTICS_FILTERS,
  toAnalyticsQueryParams,
  type AnalyticsFilterState,
} from "@/components/analytics/analytics-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { getAnalyticsExportData } from "@/lib/api/analytics";
import {
  buildBranchSummaryCsv,
  buildHostSummaryCsv,
  buildVisitsCsv,
  downloadExcelWorkbook,
  downloadTextFile,
  openPrintablePdfReport,
} from "@/lib/analytics/export-utils";
import type { BranchSummary } from "@/lib/api/branches";

type ExportFormat = "csv-visits" | "csv-branches" | "csv-hosts" | "excel" | "pdf";

export function ExportCenter({
  branches,
  branchesLoading,
}: {
  branches: BranchSummary[];
  branchesLoading?: boolean;
}) {
  const [filters, setFilters] = useState<AnalyticsFilterState>(
    DEFAULT_ANALYTICS_FILTERS,
  );
  const [format, setFormat] = useState<ExportFormat>("excel");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runExport = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      const data = await getAnalyticsExportData(toAnalyticsQueryParams(filters));
      const stamp = new Date().toISOString().slice(0, 10);

      if (format === "csv-visits") {
        downloadTextFile(
          `entriss-visits-${stamp}.csv`,
          buildVisitsCsv(data),
          "text/csv;charset=utf-8",
        );
      } else if (format === "csv-branches") {
        downloadTextFile(
          `entriss-branches-${stamp}.csv`,
          buildBranchSummaryCsv(data),
          "text/csv;charset=utf-8",
        );
      } else if (format === "csv-hosts") {
        downloadTextFile(
          `entriss-hosts-${stamp}.csv`,
          buildHostSummaryCsv(data),
          "text/csv;charset=utf-8",
        );
      } else if (format === "excel") {
        await downloadExcelWorkbook(data, `entriss-analytics-${stamp}.xlsx`);
      } else {
        openPrintablePdfReport(data);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Export could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }, [filters, format]);

  return (
    <div className="space-y-4">
      <AnalyticsFilters
        filters={filters}
        branches={branches}
        branchesLoading={branchesLoading}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Export center</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Export read-only analytics derived from existing visit, visitor, audit,
            and activity data. One batched payload is fetched per export.
          </p>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--muted)]">Export type</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as ExportFormat)}
              className="h-9 w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            >
              <option value="excel">Excel workbook (multi-sheet)</option>
              <option value="csv-visits">CSV — visits</option>
              <option value="csv-branches">CSV — branch summary</option>
              <option value="csv-hosts">CSV — host summary</option>
              <option value="pdf">PDF report (print dialog)</option>
            </select>
          </label>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="button" disabled={busy} onClick={() => void runExport()}>
            {busy ? "Preparing export…" : "Download export"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
