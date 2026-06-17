import type { AnalyticsQueryType } from "@/lib/analytics/snapshots/snapshot-types";
import type { NormalizedAnalyticsFilters } from "@/lib/analytics/query/filters";
import type { AnalyticsDashboardResult } from "@/lib/services/analytics-dashboard.service";
import type { BranchAnalyticsResult } from "@/lib/services/analytics-branch.service";
import type { HostAnalyticsResult } from "@/lib/services/analytics-host.service";
import type { AuditAnalyticsResult } from "@/lib/services/analytics-audit.service";

import type {
  AnalyticsSnapshotPeriod,
  AnalyticsSnapshotType,
} from "./snapshot-types";

export function isSnapshotEligible(
  filters: NormalizedAnalyticsFilters,
): filters is NormalizedAnalyticsFilters & {
  range: { period: AnalyticsSnapshotPeriod };
} {
  const { period } = filters.range;

  if (period === "custom") {
    return false;
  }

  if (filters.branchId || filters.hostId || filters.category) {
    return false;
  }

  if (filters.dateFrom || filters.dateTo) {
    return false;
  }

  return true;
}

export function mapSnapshotTypeToQueryType(
  type: AnalyticsSnapshotType,
): AnalyticsQueryType {
  if (type === "branch") {
    return "branch";
  }

  return type;
}

export function deserializeDashboardSnapshot(
  data: unknown,
): AnalyticsDashboardResult {
  return data as AnalyticsDashboardResult;
}

export function deserializeBranchSnapshot(data: unknown): BranchAnalyticsResult {
  return data as BranchAnalyticsResult;
}

export function deserializeHostSnapshot(data: unknown): HostAnalyticsResult {
  return data as HostAnalyticsResult;
}

export function deserializeAuditSnapshot(data: unknown): AuditAnalyticsResult {
  return data as AuditAnalyticsResult;
}

export function deserializeSnapshotData(
  type: AnalyticsSnapshotType,
  data: unknown,
):
  | AnalyticsDashboardResult
  | BranchAnalyticsResult
  | HostAnalyticsResult
  | AuditAnalyticsResult {
  switch (type) {
    case "dashboard":
      return deserializeDashboardSnapshot(data);
    case "branch":
      return deserializeBranchSnapshot(data);
    case "host":
      return deserializeHostSnapshot(data);
    case "audit":
      return deserializeAuditSnapshot(data);
  }
}

export function isSnapshotFresh(
  updatedAt: Date,
  period: AnalyticsSnapshotPeriod,
  ttlMs: Record<AnalyticsSnapshotPeriod, number>,
): boolean {
  return Date.now() - updatedAt.getTime() < ttlMs[period];
}
