import {
  buildAuditCacheKey,
  buildBranchCacheKey,
  buildDashboardCacheKey,
  buildHostCacheKey,
} from "@/lib/analytics/cache/cache-keys";
import {
  ANALYTICS_CACHE_TTL_MS,
  getAnalyticsCache,
  setAnalyticsCache,
} from "@/lib/analytics/cache/cache.service";
import { readAnalyticsSnapshot } from "@/lib/analytics/snapshots/snapshot-reader.service";
import { isSnapshotEligible } from "@/lib/analytics/snapshots/snapshot-mappers";
import { triggerSnapshotRebuild } from "@/lib/analytics/snapshots/snapshot-rebuild";
import { writeAnalyticsSnapshot } from "@/lib/analytics/snapshots/snapshot-writer.service";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { AnalyticsDashboardResult } from "@/lib/services/analytics-dashboard.service";
import type { BranchAnalyticsResult } from "@/lib/services/analytics-branch.service";
import type { HostAnalyticsResult } from "@/lib/services/analytics-host.service";
import type { AuditAnalyticsResult } from "@/lib/services/analytics-audit.service";

import {
  runLiveAuditQuery,
  runLiveBranchQuery,
  runLiveDashboardQuery,
  runLiveHostQuery,
} from "./analytics-live-query";
import {
  filtersToCacheParams,
  normalizeAnalyticsFilters,
  type AnalyticsQueryFilters,
} from "./filters";

export type { AnalyticsQueryType } from "@/lib/analytics/snapshots/snapshot-types";

function resolveCacheKey(
  type: import("@/lib/analytics/snapshots/snapshot-types").AnalyticsQueryType,
  organizationId: string,
  filters: ReturnType<typeof normalizeAnalyticsFilters>,
) {
  const cacheParams = filtersToCacheParams(filters);
  const period = filters.range.period;

  switch (type) {
    case "dashboard":
      return buildDashboardCacheKey(organizationId, period, cacheParams);
    case "branch":
      return buildBranchCacheKey(
        organizationId,
        filters.branchId,
        period,
        cacheParams,
      );
    case "host":
      return buildHostCacheKey(organizationId, filters.hostId, period, cacheParams);
    case "audit":
      return buildAuditCacheKey(organizationId, period, cacheParams);
  }
}

function scheduleSnapshotBackfill(
  organizationId: string,
  type: import("@/lib/analytics/snapshots/snapshot-types").AnalyticsQueryType,
  normalized: ReturnType<typeof normalizeAnalyticsFilters>,
) {
  if (!isSnapshotEligible(normalized)) {
    return;
  }

  const period = normalized.range.period;

  void writeAnalyticsSnapshot(organizationId, type, period).catch(() => {
    triggerSnapshotRebuild(organizationId);
  });
}

export async function queryAnalytics<
  T extends import("@/lib/analytics/snapshots/snapshot-types").AnalyticsQueryType,
>(input: {
  type: T;
  filters: AnalyticsQueryFilters;
  ctx: TenantContext;
}): Promise<
  T extends "dashboard"
    ? AnalyticsDashboardResult
    : T extends "branch"
      ? BranchAnalyticsResult
      : T extends "host"
        ? HostAnalyticsResult
        : AuditAnalyticsResult
> {
  requirePermission(
    input.ctx,
    input.type === "audit" ? PERMISSIONS.AUDIT_READ : PERMISSIONS.VISITOR_READ,
  );

  const normalized = normalizeAnalyticsFilters(input.filters);
  const cacheKey = resolveCacheKey(input.type, input.ctx.organizationId, normalized);
  const cached = getAnalyticsCache(cacheKey);

  if (cached !== null) {
    return cached as never;
  }

  const snapshot = await readAnalyticsSnapshot(
    input.ctx.organizationId,
    input.type,
    normalized,
  );

  if (snapshot !== null) {
    setAnalyticsCache(cacheKey, snapshot, ANALYTICS_CACHE_TTL_MS);
    return snapshot as never;
  }

  let result:
    | AnalyticsDashboardResult
    | BranchAnalyticsResult
    | HostAnalyticsResult
    | AuditAnalyticsResult;

  switch (input.type) {
    case "dashboard":
      result = await runLiveDashboardQuery(input.ctx, input.filters);
      break;
    case "branch":
      result = await runLiveBranchQuery(input.ctx, input.filters);
      break;
    case "host":
      result = await runLiveHostQuery(input.ctx, input.filters);
      break;
    case "audit":
      result = await runLiveAuditQuery(input.ctx, input.filters);
      break;
  }

  setAnalyticsCache(cacheKey, result, ANALYTICS_CACHE_TTL_MS);
  scheduleSnapshotBackfill(input.ctx.organizationId, input.type, normalized);
  return result as never;
}
