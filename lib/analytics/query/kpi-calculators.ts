import { VisitStatus } from "@prisma/client";
import {
  computeDurationMinutes,
  type AnalyticsVisitRow,
} from "@/lib/analytics/visit-rows";

import { isNoShowVisit } from "./no-show.engine";

export interface VisitStatusBreakdown {
  total: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
  noShows: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface VisitKPIs {
  totalInRange: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
  noShows: number;
  noShowRate: number;
}

export function calculateStatusBreakdown(
  visits: AnalyticsVisitRow[],
): VisitStatusBreakdown {
  const breakdown: VisitStatusBreakdown = {
    total: visits.length,
    checkedIn: 0,
    completed: 0,
    cancelled: 0,
    noShows: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const visit of visits) {
    if (visit.status === VisitStatus.CHECKED_IN) {
      breakdown.checkedIn += 1;
    }
    if (visit.status === VisitStatus.CHECKED_OUT) {
      breakdown.completed += 1;
    }
    if (visit.status === VisitStatus.CANCELLED) {
      breakdown.cancelled += 1;
    }
    if (visit.status === VisitStatus.PENDING) {
      breakdown.pending += 1;
    }
    if (visit.status === VisitStatus.APPROVED) {
      breakdown.approved += 1;
    }
    if (visit.status === VisitStatus.REJECTED) {
      breakdown.rejected += 1;
    }
    if (isNoShowVisit(visit)) {
      breakdown.noShows += 1;
    }
  }

  return breakdown;
}

export function calculateVisitKPIs(visits: AnalyticsVisitRow[]): VisitKPIs {
  const breakdown = calculateStatusBreakdown(visits);

  return {
    totalInRange: breakdown.total,
    checkedIn: breakdown.checkedIn,
    completed: breakdown.completed,
    cancelled: breakdown.cancelled,
    noShows: breakdown.noShows,
    noShowRate: calculateNoShowRate(visits),
  };
}

export function calculateNoShowRate(visits: AnalyticsVisitRow[]): number {
  if (visits.length === 0) {
    return 0;
  }

  const noShows = visits.filter((visit) => isNoShowVisit(visit)).length;
  return Math.round((noShows / visits.length) * 100);
}

export function calculateAvgDuration(
  visits: AnalyticsVisitRow[],
): number | null {
  let durationTotal = 0;
  let durationCount = 0;

  for (const visit of visits) {
    if (visit.status !== VisitStatus.CHECKED_OUT) {
      continue;
    }

    const duration = computeDurationMinutes(
      visit.checkedInAt,
      visit.checkedOutAt,
    );
    if (duration !== null) {
      durationTotal += duration;
      durationCount += 1;
    }
  }

  if (durationCount === 0) {
    return null;
  }

  return Math.round(durationTotal / durationCount);
}
