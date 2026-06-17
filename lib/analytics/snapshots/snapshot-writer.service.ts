import { prisma } from "@/lib/db/client";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import {
  runLiveAuditQuery,
  runLiveBranchQuery,
  runLiveDashboardQuery,
  runLiveHostQuery,
} from "../query/analytics-live-query";
import type { AnalyticsQueryFilters } from "../query/filters";
import { resolveAnalyticsDateRange } from "../date-ranges";

import { buildSnapshotTenantContext } from "./snapshot-context";
import type {
  AnalyticsSnapshotPeriod,
  AnalyticsSnapshotType,
} from "./snapshot-types";

async function computeSnapshotData(
  ctx: TenantContext,
  type: AnalyticsSnapshotType,
  period: AnalyticsSnapshotPeriod,
) {
  const filters: AnalyticsQueryFilters = { period };

  switch (type) {
    case "dashboard":
      return runLiveDashboardQuery(ctx, filters);
    case "branch":
      return runLiveBranchQuery(ctx, filters);
    case "host":
      return runLiveHostQuery(ctx, filters);
    case "audit":
      return runLiveAuditQuery(ctx, filters);
  }
}

export async function writeAnalyticsSnapshot(
  organizationId: string,
  type: AnalyticsSnapshotType,
  period: AnalyticsSnapshotPeriod,
) {
  const ctx = await buildSnapshotTenantContext(organizationId);
  const range = resolveAnalyticsDateRange({ period });
  const data = await computeSnapshotData(ctx, type, period);

  try {
    return await prisma.analyticsSnapshot.upsert({
      where: {
        organizationId_type_period_periodStart: {
          organizationId,
          type,
          period,
          periodStart: range.from,
        },
      },
      create: {
        organizationId,
        type,
        period,
        periodStart: range.from,
        periodEnd: range.to,
        data: data as object,
      },
      update: {
        periodEnd: range.to,
        data: data as object,
      },
    });
  } catch {
    return null;
  }
}

export async function writeAllSnapshotsForOrganization(
  organizationId: string,
  periods: AnalyticsSnapshotPeriod[],
) {
  const { SNAPSHOT_TYPES } = await import("./snapshot-types");

  for (const period of periods) {
    for (const type of SNAPSHOT_TYPES) {
      await writeAnalyticsSnapshot(organizationId, type, period);
    }
  }
}
