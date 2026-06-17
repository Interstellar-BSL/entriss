"use client";

import { useEffect, useState } from "react";

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { AuditReportsPanel } from "@/components/analytics/audit-reports-panel";
import { BranchAnalyticsPanel } from "@/components/analytics/branch-analytics-panel";
import { ExportCenter } from "@/components/analytics/export-center";
import { HostAnalyticsPanel } from "@/components/analytics/host-analytics-panel";
import { Button } from "@/components/ui/button";
import { listBranches, type BranchSummary } from "@/lib/api/branches";
import { cn } from "@/lib/utils/cn";

type AnalyticsTab =
  | "dashboard"
  | "branches"
  | "hosts"
  | "exports"
  | "audit";

const TABS: Array<{ id: AnalyticsTab; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "branches", label: "Branches" },
  { id: "hosts", label: "Hosts" },
  { id: "audit", label: "Audit" },
  { id: "exports", label: "Exports" },
];

export function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>("dashboard");
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    void listBranches()
      .then((response) => setBranches(response.items))
      .finally(() => setBranchesLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Analytics
          </h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            Read-only management visibility across visits, branches, hosts, and audit
            activity
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setRefreshNonce((value) => value + 1)}
        >
          Refresh
        </Button>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-[var(--border)] pb-px">
        {TABS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={tab === item.id ? "secondary" : "ghost"}
            className={cn(
              "h-8 rounded-b-none text-xs",
              tab === item.id && "border border-b-0 border-[var(--border)] bg-[var(--card)]",
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      {tab === "dashboard" ? (
        <AnalyticsDashboard
          branches={branches}
          branchesLoading={branchesLoading}
          refreshNonce={refreshNonce}
        />
      ) : null}
      {tab === "branches" ? (
        <BranchAnalyticsPanel
          branches={branches}
          branchesLoading={branchesLoading}
          refreshNonce={refreshNonce}
        />
      ) : null}
      {tab === "hosts" ? (
        <HostAnalyticsPanel
          branches={branches}
          branchesLoading={branchesLoading}
          refreshNonce={refreshNonce}
        />
      ) : null}
      {tab === "audit" ? (
        <AuditReportsPanel
          branches={branches}
          branchesLoading={branchesLoading}
          refreshNonce={refreshNonce}
        />
      ) : null}
      {tab === "exports" ? (
        <ExportCenter branches={branches} branchesLoading={branchesLoading} />
      ) : null}
    </div>
  );
}
