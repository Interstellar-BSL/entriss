import { VisitStatus } from "@/app/generated/prisma/enums";
import {
  eachDayInRange,
  formatDateKey,
  type AnalyticsDateRange,
} from "@/lib/analytics/date-ranges";
import type { AnalyticsVisitRow } from "@/lib/analytics/visit-rows";

import { isNoShowVisit } from "./no-show.engine";

export interface DailyTrendPoint {
  date: string;
  total: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
  noShows: number;
}

export interface BranchDailyTrendPoint {
  date: string;
  branchId: string;
  branchName: string;
  visits: number;
}

export function buildDailyTrendSkeleton(
  range: AnalyticsDateRange,
): Map<string, DailyTrendPoint> {
  const trendMap = new Map<string, DailyTrendPoint>();

  for (const day of eachDayInRange(range.from, range.to)) {
    trendMap.set(day, {
      date: day,
      total: 0,
      checkedIn: 0,
      completed: 0,
      cancelled: 0,
      noShows: 0,
    });
  }

  return trendMap;
}

export function bucketVisitsByDay(
  visits: AnalyticsVisitRow[],
  range: AnalyticsDateRange,
): DailyTrendPoint[] {
  const trendMap = buildDailyTrendSkeleton(range);

  for (const visit of visits) {
    const key = formatDateKey(visit.createdAt);
    const point = trendMap.get(key);
    if (!point) {
      continue;
    }

    point.total += 1;
    if (visit.status === VisitStatus.CHECKED_IN) {
      point.checkedIn += 1;
    }
    if (visit.status === VisitStatus.CHECKED_OUT) {
      point.completed += 1;
    }
    if (visit.status === VisitStatus.CANCELLED) {
      point.cancelled += 1;
    }
    if (isNoShowVisit(visit)) {
      point.noShows += 1;
    }
  }

  return [...trendMap.values()];
}

export function bucketVisitsByBranchDay(
  visits: AnalyticsVisitRow[],
): Map<string, BranchDailyTrendPoint> {
  const trendMap = new Map<string, BranchDailyTrendPoint>();

  for (const visit of visits) {
    const dayKey = `${visit.branchId}:${formatDateKey(visit.createdAt)}`;
    const trendPoint = trendMap.get(dayKey) ?? {
      date: formatDateKey(visit.createdAt),
      branchId: visit.branch.id,
      branchName: visit.branch.name,
      visits: 0,
    };
    trendPoint.visits += 1;
    trendMap.set(dayKey, trendPoint);
  }

  return trendMap;
}

export function filterTrendPointsToLastNDays(
  trendMap: Map<string, BranchDailyTrendPoint>,
  rangeEnd: Date,
  days: number,
): BranchDailyTrendPoint[] {
  const lastFrom = new Date(rangeEnd);
  lastFrom.setDate(lastFrom.getDate() - (days - 1));
  const trendDays = eachDayInRange(lastFrom, rangeEnd);

  return [...trendMap.values()].filter((point) => trendDays.includes(point.date));
}

export function resolvePeakDaysByBranch(
  trendMap: Map<string, BranchDailyTrendPoint>,
): Array<{
  branchId: string;
  branchName: string;
  date: string;
  visits: number;
}> {
  const peakDayMap = new Map<string, BranchDailyTrendPoint>();

  for (const point of trendMap.values()) {
    const peakKey = point.branchId;
    const current = peakDayMap.get(peakKey);
    if (!current || point.visits > current.visits) {
      peakDayMap.set(peakKey, point);
    }
  }

  return [...peakDayMap.values()].map((point) => ({
    branchId: point.branchId,
    branchName: point.branchName,
    date: point.date,
    visits: point.visits,
  }));
}
