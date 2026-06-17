import {
  resolveAnalyticsDateRange,
  type AnalyticsPeriod,
} from "@/lib/analytics/date-ranges";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { getAuditAnalytics } from "./analytics-audit.service";
import { getBranchAnalytics } from "./analytics-branch.service";
import { getAnalyticsDashboard } from "./analytics-dashboard.service";
import { getHostAnalytics } from "./analytics-host.service";

export interface AnalyticsExportFilters {
  period?: AnalyticsPeriod;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
}

export interface AnalyticsExportVisitRow {
  visitId: string;
  visitorId: string;
  branchName: string;
  hostName: string;
  status: string;
  scheduledAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  createdAt: string;
}

export interface AnalyticsExportPayload {
  range: {
    period: AnalyticsPeriod;
    from: string;
    to: string;
    label: string;
  };
  overview: Awaited<ReturnType<typeof getAnalyticsDashboard>>;
  branches: Awaited<ReturnType<typeof getBranchAnalytics>>;
  hosts: Awaited<ReturnType<typeof getHostAnalytics>>;
  audit: Awaited<ReturnType<typeof getAuditAnalytics>>;
  visits: AnalyticsExportVisitRow[];
  generatedAt: string;
}

export async function getAnalyticsExportPayload(
  ctx: TenantContext,
  filters: AnalyticsExportFilters = {},
): Promise<AnalyticsExportPayload> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const range = resolveAnalyticsDateRange(filters);
  const sharedFilters = {
    period: filters.period,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    branchId: filters.branchId,
  };

  const [overview, branches, hosts, audit] = await Promise.all([
    getAnalyticsDashboard(ctx, sharedFilters),
    getBranchAnalytics(ctx, sharedFilters),
    getHostAnalytics(ctx, sharedFilters),
    getAuditAnalytics(ctx, sharedFilters),
  ]);

  const { getAnalyticsVisitDataset } = await import(
    "@/lib/analytics/query/visit-dataset"
  );
  const { hostDisplayName } = await import("@/lib/analytics/visit-rows");
  const visitRows = await getAnalyticsVisitDataset(ctx, range, filters.branchId);

  return {
    range: {
      period: range.period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      label: range.label,
    },
    overview,
    branches,
    hosts,
    audit,
    visits: visitRows.map((visit) => ({
      visitId: visit.id,
      visitorId: visit.visitorId,
      branchName: visit.branch.name,
      hostName: hostDisplayName(visit.host),
      status: visit.status,
      scheduledAt: visit.scheduledAt?.toISOString() ?? null,
      checkedInAt: visit.checkedInAt?.toISOString() ?? null,
      checkedOutAt: visit.checkedOutAt?.toISOString() ?? null,
      createdAt: visit.createdAt.toISOString(),
    })),
    generatedAt: new Date().toISOString(),
  };
}
