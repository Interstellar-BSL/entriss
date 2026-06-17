import { VisitStatus } from "@/app/generated/prisma/enums";
import {
  computeDurationMinutes,
  hostDisplayName,
  resolveActivityTimestamp,
  type AnalyticsVisitRow,
} from "@/lib/analytics/visit-rows";

export interface BranchBreakdownRow {
  branchId: string;
  branchName: string;
  totalVisits: number;
  checkIns: number;
  completedVisits: number;
  completionRate: number;
  firstTimeVisitors: number;
  returningVisitors: number;
}

export interface BranchHourlyCell {
  branchId: string;
  branchName: string;
  hour: number;
  count: number;
}

export interface HostBreakdownRow {
  hostId: string;
  hostName: string;
  totalVisits: number;
  completedVisits: number;
  pendingVisits: number;
  checkedInVisits: number;
  averageDurationMinutes: number | null;
}

function buildVisitorCountsByBranch(visits: AnalyticsVisitRow[]) {
  const branchVisitorCounts = new Map<string, Map<string, number>>();

  for (const visit of visits) {
    const visitorMap =
      branchVisitorCounts.get(visit.branchId) ?? new Map<string, number>();
    visitorMap.set(visit.visitorId, (visitorMap.get(visit.visitorId) ?? 0) + 1);
    branchVisitorCounts.set(visit.branchId, visitorMap);
  }

  return branchVisitorCounts;
}

export function buildBranchBreakdown(
  visits: AnalyticsVisitRow[],
): BranchBreakdownRow[] {
  const branchMap = new Map<string, BranchBreakdownRow>();
  const visitorCountsByBranch = buildVisitorCountsByBranch(visits);

  for (const visit of visits) {
    const existing = branchMap.get(visit.branchId) ?? {
      branchId: visit.branch.id,
      branchName: visit.branch.name,
      totalVisits: 0,
      checkIns: 0,
      completedVisits: 0,
      completionRate: 0,
      firstTimeVisitors: 0,
      returningVisitors: 0,
    };

    existing.totalVisits += 1;
    if (visit.checkedInAt) {
      existing.checkIns += 1;
    }
    if (visit.status === VisitStatus.CHECKED_OUT) {
      existing.completedVisits += 1;
    }

    branchMap.set(visit.branchId, existing);
  }

  for (const row of branchMap.values()) {
    row.completionRate =
      row.totalVisits === 0
        ? 0
        : Math.round((row.completedVisits / row.totalVisits) * 100);

    const visitorCounts = visitorCountsByBranch.get(row.branchId);
    if (!visitorCounts) {
      continue;
    }

    for (const count of visitorCounts.values()) {
      if (count <= 1) {
        row.firstTimeVisitors += 1;
      } else {
        row.returningVisitors += 1;
      }
    }
  }

  return [...branchMap.values()].sort(
    (left, right) => right.totalVisits - left.totalVisits,
  );
}

export function buildHourlyBreakdown(
  visits: AnalyticsVisitRow[],
): BranchHourlyCell[] {
  const hourlyMap = new Map<string, BranchHourlyCell>();

  for (const visit of visits) {
    const activityAt = resolveActivityTimestamp(visit);
    const hour = activityAt.getHours();
    const hourlyKey = `${visit.branchId}:${hour}`;
    const hourlyCell = hourlyMap.get(hourlyKey) ?? {
      branchId: visit.branch.id,
      branchName: visit.branch.name,
      hour,
      count: 0,
    };
    hourlyCell.count += 1;
    hourlyMap.set(hourlyKey, hourlyCell);
  }

  return [...hourlyMap.values()].sort((left, right) => {
    if (left.branchName === right.branchName) {
      return left.hour - right.hour;
    }
    return left.branchName.localeCompare(right.branchName);
  });
}

export function buildStatusBreakdown(
  visits: AnalyticsVisitRow[],
): Array<{ status: VisitStatus; count: number }> {
  const statusMap = new Map<VisitStatus, number>();

  for (const visit of visits) {
    statusMap.set(visit.status, (statusMap.get(visit.status) ?? 0) + 1);
  }

  return [...statusMap.entries()].map(([status, count]) => ({ status, count }));
}

export function buildHostBreakdown(
  visits: AnalyticsVisitRow[],
): HostBreakdownRow[] {
  const hostMap = new Map<
    string,
    HostBreakdownRow & { durationTotal: number; durationCount: number }
  >();

  for (const visit of visits) {
    const existing = hostMap.get(visit.hostMemberId) ?? {
      hostId: visit.host.id,
      hostName: hostDisplayName(visit.host),
      totalVisits: 0,
      completedVisits: 0,
      pendingVisits: 0,
      checkedInVisits: 0,
      averageDurationMinutes: null,
      durationTotal: 0,
      durationCount: 0,
    };

    existing.totalVisits += 1;
    if (visit.status === VisitStatus.CHECKED_OUT) {
      existing.completedVisits += 1;
      const duration = computeDurationMinutes(
        visit.checkedInAt,
        visit.checkedOutAt,
      );
      if (duration !== null) {
        existing.durationTotal += duration;
        existing.durationCount += 1;
      }
    }
    if (visit.status === VisitStatus.PENDING) {
      existing.pendingVisits += 1;
    }
    if (visit.status === VisitStatus.CHECKED_IN) {
      existing.checkedInVisits += 1;
    }

    hostMap.set(visit.hostMemberId, existing);
  }

  return [...hostMap.values()]
    .map(({ durationTotal, durationCount, ...row }) => ({
      ...row,
      averageDurationMinutes:
        durationCount === 0 ? null : Math.round(durationTotal / durationCount),
    }))
    .sort((left, right) => right.totalVisits - left.totalVisits);
}
