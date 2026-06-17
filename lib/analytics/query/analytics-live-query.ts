import { VisitStatus } from "@/app/generated/prisma/enums";
import { resolveAnalyticsDateRange } from "@/lib/analytics/date-ranges";
import { prisma } from "@/lib/db/client";
import { getActivityStream } from "@/lib/services/activity-stream.service";
import type { AnalyticsDashboardResult } from "@/lib/services/analytics-dashboard.service";
import type { BranchAnalyticsResult } from "@/lib/services/analytics-branch.service";
import type { HostAnalyticsResult } from "@/lib/services/analytics-host.service";
import type {
  AuditAnalyticsResult,
  AuditComplianceRow,
  AuditSuspiciousPatternRow,
} from "@/lib/services/analytics-audit.service";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import {
  buildBranchBreakdown,
  buildHostBreakdown,
  buildHourlyBreakdown,
  buildStatusBreakdown,
} from "./breakdown-builders";
import { normalizeAnalyticsFilters, type AnalyticsQueryFilters } from "./filters";
import { calculateStatusBreakdown } from "./kpi-calculators";
import {
  bucketVisitsByBranchDay,
  bucketVisitsByDay,
  filterTrendPointsToLastNDays,
  resolvePeakDaysByBranch,
} from "./time-bucketing";
import { getAnalyticsVisitDataset } from "./visit-dataset";

const OVERRIDE_ACTIONS = ["FORCE_CHECKIN", "FORCE_CHECKOUT"] as const;

async function countVisitsInRange(
  ctx: TenantContext,
  from: Date,
  to: Date,
  branchId?: string,
) {
  return prisma.visit.count({
    where: {
      organizationId: ctx.organizationId,
      createdAt: { gte: from, lte: to },
      ...(branchId ? { branchId } : {}),
    },
  });
}

export async function runLiveDashboardQuery(
  ctx: TenantContext,
  filters: AnalyticsQueryFilters,
): Promise<AnalyticsDashboardResult> {
  const normalized = normalizeAnalyticsFilters(filters);
  const { range } = normalized;
  const now = new Date();
  const dailyRange = resolveAnalyticsDateRange({ period: "daily", now });
  const weeklyRange = resolveAnalyticsDateRange({ period: "weekly", now });
  const monthlyRange = resolveAnalyticsDateRange({ period: "monthly", now });

  const [visits, daily, weekly, monthly] = await Promise.all([
    getAnalyticsVisitDataset(ctx, range, normalized.branchId),
    countVisitsInRange(ctx, dailyRange.from, dailyRange.to, normalized.branchId),
    countVisitsInRange(ctx, weeklyRange.from, weeklyRange.to, normalized.branchId),
    countVisitsInRange(
      ctx,
      monthlyRange.from,
      monthlyRange.to,
      normalized.branchId,
    ),
  ]);

  const statusBreakdown = calculateStatusBreakdown(visits);

  return {
    range: {
      period: range.period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      label: range.label,
    },
    kpis: {
      daily,
      weekly,
      monthly,
      totalInRange: statusBreakdown.total,
      checkedIn: statusBreakdown.checkedIn,
      completed: statusBreakdown.completed,
      cancelled: statusBreakdown.cancelled,
      noShows: statusBreakdown.noShows,
    },
    statusBreakdown,
    trend: bucketVisitsByDay(visits, range),
    generatedAt: new Date().toISOString(),
  };
}

export async function runLiveBranchQuery(
  ctx: TenantContext,
  filters: AnalyticsQueryFilters,
): Promise<BranchAnalyticsResult> {
  const normalized = normalizeAnalyticsFilters(filters);
  const { range } = normalized;
  const visits = await getAnalyticsVisitDataset(ctx, range, normalized.branchId);
  const trendMap = bucketVisitsByBranchDay(visits);

  return {
    range: {
      period: range.period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      label: range.label,
    },
    branches: buildBranchBreakdown(visits),
    hourlyHeatmap: buildHourlyBreakdown(visits),
    trends: filterTrendPointsToLastNDays(trendMap, range.to, 30),
    peakDays: resolvePeakDaysByBranch(trendMap),
    generatedAt: new Date().toISOString(),
  };
}

export async function runLiveHostQuery(
  ctx: TenantContext,
  filters: AnalyticsQueryFilters,
): Promise<HostAnalyticsResult> {
  const normalized = normalizeAnalyticsFilters(filters);
  const { range } = normalized;
  const visits = await getAnalyticsVisitDataset(ctx, range, normalized.branchId);
  const hosts = buildHostBreakdown(visits);

  return {
    range: {
      period: range.period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      label: range.label,
    },
    hosts,
    selectedHost:
      normalized.hostId != null
        ? hosts.find((host) => host.hostId === normalized.hostId) ?? null
        : null,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLiveAuditQuery(
  ctx: TenantContext,
  filters: AnalyticsQueryFilters,
): Promise<AuditAnalyticsResult> {
  const normalized = normalizeAnalyticsFilters(filters);
  const { range } = normalized;
  const visits = await getAnalyticsVisitDataset(ctx, range, normalized.branchId);

  const missingCheckouts: AuditComplianceRow[] = [];
  const approvalDelays: AuditComplianceRow[] = [];
  const dayVisitorCounts = new Map<string, Map<string, number>>();
  const visitorNameMap = new Map<string, string>();

  const approvalDelayThresholdMs = 2 * 60 * 60 * 1000;
  const staleCheckoutThreshold = new Date();
  staleCheckoutThreshold.setHours(0, 0, 0, 0);

  for (const visit of visits) {
    visitorNameMap.set(visit.visitorId, visit.visitorId);

    if (
      visit.status === VisitStatus.CHECKED_IN &&
      visit.checkedInAt &&
      visit.checkedInAt < staleCheckoutThreshold
    ) {
      missingCheckouts.push({
        visitId: visit.id,
        visitorName: visit.visitorId,
        branchName: visit.branch.name,
        status: visit.status,
        scheduledAt: visit.scheduledAt?.toISOString() ?? null,
        checkedInAt: visit.checkedInAt.toISOString(),
        issue: "Checked in without checkout",
      });
    }

    if (
      visit.status === VisitStatus.PENDING &&
      Date.now() - visit.createdAt.getTime() > approvalDelayThresholdMs
    ) {
      approvalDelays.push({
        visitId: visit.id,
        visitorName: visit.visitorId,
        branchName: visit.branch.name,
        status: visit.status,
        scheduledAt: visit.scheduledAt?.toISOString() ?? null,
        checkedInAt: visit.checkedInAt?.toISOString() ?? null,
        issue: "Pending approval beyond threshold",
      });
    }

    const dayKey = visit.createdAt.toISOString().slice(0, 10);
    const visitorDayMap =
      dayVisitorCounts.get(dayKey) ?? new Map<string, number>();
    visitorDayMap.set(
      visit.visitorId,
      (visitorDayMap.get(visit.visitorId) ?? 0) + 1,
    );
    dayVisitorCounts.set(dayKey, visitorDayMap);
  }

  const visitorIds = [...visitorNameMap.keys()];
  if (visitorIds.length > 0) {
    const visitors = await prisma.visitor.findMany({
      where: {
        organizationId: ctx.organizationId,
        id: { in: visitorIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    for (const visitor of visitors) {
      visitorNameMap.set(
        visitor.id,
        `${visitor.firstName} ${visitor.lastName}`.trim(),
      );
    }
  }

  for (const row of missingCheckouts) {
    row.visitorName = visitorNameMap.get(row.visitorName) ?? row.visitorName;
  }
  for (const row of approvalDelays) {
    row.visitorName = visitorNameMap.get(row.visitorName) ?? row.visitorName;
  }

  const suspiciousPatterns: AuditSuspiciousPatternRow[] = [];
  for (const [date, visitorCounts] of dayVisitorCounts) {
    for (const [visitorId, count] of visitorCounts) {
      if (count > 1) {
        suspiciousPatterns.push({
          visitorId,
          visitorName: visitorNameMap.get(visitorId) ?? visitorId,
          date,
          visitCount: count,
        });
      }
    }
  }

  const overrideGroups = await prisma.auditLog.groupBy({
    by: ["action"],
    where: {
      organizationId: ctx.organizationId,
      action: { in: [...OVERRIDE_ACTIONS] },
      createdAt: {
        gte: range.from,
        lte: range.to,
      },
    },
    _count: { _all: true },
  });

  const activity = await getActivityStream(ctx, {
    from: range.from,
    to: range.to,
    branchId: normalized.branchId,
    category: normalized.category as never,
    limit: 100,
  });

  return {
    range: {
      period: range.period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      label: range.label,
    },
    visitsByStatus: buildStatusBreakdown(visits),
    missingCheckouts: missingCheckouts.slice(0, 50),
    approvalDelays: approvalDelays.slice(0, 50),
    overrideUsage: overrideGroups.map((group) => ({
      action: group.action,
      count: group._count._all,
    })),
    suspiciousPatterns: suspiciousPatterns
      .sort((left, right) => right.visitCount - left.visitCount)
      .slice(0, 50),
    activity,
    generatedAt: new Date().toISOString(),
  };
}
