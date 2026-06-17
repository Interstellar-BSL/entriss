import { VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import { isNoShowVisit } from "@/lib/visits/no-show";

import { visitInclude } from "./internal/visit-include";
import { getVisitorById } from "./visitor.service";

export type VisitorType =
  | "FIRST_TIME"
  | "RETURNING"
  | "FREQUENT"
  | "VIP"
  | "DORMANT";

export type VisitFrequency = "LOW" | "MEDIUM" | "HIGH";

export interface VisitorInsightsFavoriteBranch {
  id: string;
  name: string;
  visitCount: number;
}

export interface VisitorInsightsFavoriteHost {
  id: string;
  name: string;
  visitCount: number;
}

export interface VisitorInsightsMostRecentHost {
  id: string;
  name: string;
}

export interface VisitorInsightsMostRecentBranch {
  id: string;
  name: string;
}

export interface VisitorInsightsLastVisit {
  visitId: string;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  durationMinutes: number | null;
  host: VisitorInsightsMostRecentHost;
  branch: VisitorInsightsMostRecentBranch;
  occurredAt: Date;
}

export interface VisitorInsightsData {
  visitCount: number;
  completedVisitCount: number;
  cancelledVisitCount: number;
  noShowCount: number;
  firstVisitAt: Date | null;
  lastVisitAt: Date | null;
  averageVisitDurationMinutes: number | null;
  favoriteBranch: VisitorInsightsFavoriteBranch | null;
  favoriteHost: VisitorInsightsFavoriteHost | null;
  mostRecentHost: VisitorInsightsMostRecentHost | null;
  mostRecentBranch: VisitorInsightsMostRecentBranch | null;
  lastVisit: VisitorInsightsLastVisit | null;
  daysSinceLastVisit: number | null;
  visitorType: VisitorType;
  visitFrequency: VisitFrequency;
}

export interface VisitorInsightsResult {
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  insights: VisitorInsightsData;
}

const DORMANT_DAYS = 180;
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

function computeDurationMinutes(
  checkedInAt: Date | null,
  checkedOutAt: Date | null,
): number | null {
  if (!checkedInAt || !checkedOutAt) {
    return null;
  }

  const durationMs = checkedOutAt.getTime() - checkedInAt.getTime();
  if (durationMs < 0) {
    return null;
  }

  return Math.round(durationMs / 60_000);
}

function hostDisplayName(host: {
  user: { name: string | null; email: string };
}): string {
  return host.user.name?.trim() || host.user.email;
}

function computeDaysSince(date: Date | null): number | null {
  if (!date) {
    return null;
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) {
    return 0;
  }

  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

function resolveVisitorType(
  visitCount: number,
  daysSinceLastVisit: number | null,
): VisitorType {
  if (daysSinceLastVisit !== null && daysSinceLastVisit >= DORMANT_DAYS) {
    return "DORMANT";
  }

  if (visitCount <= 1) {
    return "FIRST_TIME";
  }

  if (visitCount <= 4) {
    return "RETURNING";
  }

  if (visitCount <= 9) {
    return "FREQUENT";
  }

  return "VIP";
}

function resolveVisitFrequency(visitsInLast12Months: number): VisitFrequency {
  if (visitsInLast12Months >= 7) {
    return "HIGH";
  }

  if (visitsInLast12Months >= 3) {
    return "MEDIUM";
  }

  return "LOW";
}

function resolveFavorite<T extends { id: string; name: string }>(
  visits: Array<{
    createdAt: Date;
    entity: T;
  }>,
): (T & { visitCount: number }) | null {
  if (visits.length === 0) {
    return null;
  }

  const counts = new Map<string, T & { visitCount: number }>();

  for (const visit of visits) {
    const existing = counts.get(visit.entity.id);
    if (existing) {
      existing.visitCount += 1;
    } else {
      counts.set(visit.entity.id, { ...visit.entity, visitCount: 1 });
    }
  }

  const maxCount = Math.max(
    ...[...counts.values()].map((entry) => entry.visitCount),
  );
  const tiedIds = new Set(
    [...counts.values()]
      .filter((entry) => entry.visitCount === maxCount)
      .map((entry) => entry.id),
  );

  for (const visit of visits) {
    if (tiedIds.has(visit.entity.id)) {
      return counts.get(visit.entity.id) ?? null;
    }
  }

  return null;
}

export async function getVisitorInsights(
  ctx: TenantContext,
  visitorId: string,
): Promise<VisitorInsightsResult> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visitor = await getVisitorById(ctx, visitorId);

  const visits = await prisma.visit.findMany({
    where: {
      organizationId: ctx.organizationId,
      visitorId,
    },
    include: visitInclude,
    orderBy: { createdAt: "desc" },
  });

  const completedDurations: number[] = [];
  let completedVisitCount = 0;
  let cancelledVisitCount = 0;
  let noShowCount = 0;

  const twelveMonthsAgo = Date.now() - TWELVE_MONTHS_MS;
  let visitsInLast12Months = 0;

  for (const visit of visits) {
    if (visit.status === VisitStatus.CHECKED_OUT) {
      completedVisitCount += 1;
      const durationMinutes = computeDurationMinutes(
        visit.checkedInAt,
        visit.checkedOutAt,
      );
      if (durationMinutes !== null) {
        completedDurations.push(durationMinutes);
      }
    }

    if (visit.status === VisitStatus.CANCELLED) {
      cancelledVisitCount += 1;
    }

    if (isNoShowVisit(visit)) {
      noShowCount += 1;
    }

    if (visit.createdAt.getTime() >= twelveMonthsAgo) {
      visitsInLast12Months += 1;
    }
  }

  const averageVisitDurationMinutes =
    completedDurations.length > 0
      ? Math.round(
          completedDurations.reduce((sum, value) => sum + value, 0) /
            completedDurations.length,
        )
      : null;

  const lastVisitAt = visits.length > 0 ? visits[0]!.createdAt : null;
  const firstVisitAt =
    visits.length > 0 ? visits[visits.length - 1]!.createdAt : null;
  const daysSinceLastVisit = computeDaysSince(lastVisitAt);

  const branchVisits = visits.map((visit) => ({
    createdAt: visit.createdAt,
    entity: { id: visit.branch.id, name: visit.branch.name },
  }));

  const hostVisits = visits.map((visit) => ({
    createdAt: visit.createdAt,
    entity: { id: visit.host.id, name: hostDisplayName(visit.host) },
  }));

  const favoriteBranch = resolveFavorite(branchVisits);
  const favoriteHost = resolveFavorite(hostVisits);

  const mostRecentVisit = visits[0];
  const lastVisitOccurredAt = mostRecentVisit
    ? resolveLastVisitOccurredAt(mostRecentVisit)
    : null;

  return {
    visitor: {
      id: visitor.id,
      firstName: visitor.firstName,
      lastName: visitor.lastName,
    },
    insights: {
      visitCount: visits.length,
      completedVisitCount,
      cancelledVisitCount,
      noShowCount,
      firstVisitAt,
      lastVisitAt,
      averageVisitDurationMinutes,
      favoriteBranch,
      favoriteHost,
      mostRecentHost: mostRecentVisit
        ? {
            id: mostRecentVisit.host.id,
            name: hostDisplayName(mostRecentVisit.host),
          }
        : null,
      mostRecentBranch: mostRecentVisit
        ? {
            id: mostRecentVisit.branch.id,
            name: mostRecentVisit.branch.name,
          }
        : null,
      lastVisit: mostRecentVisit
        ? {
            visitId: mostRecentVisit.id,
            checkedInAt: mostRecentVisit.checkedInAt,
            checkedOutAt: mostRecentVisit.checkedOutAt,
            durationMinutes: computeDurationMinutes(
              mostRecentVisit.checkedInAt,
              mostRecentVisit.checkedOutAt,
            ),
            host: {
              id: mostRecentVisit.host.id,
              name: hostDisplayName(mostRecentVisit.host),
            },
            branch: {
              id: mostRecentVisit.branch.id,
              name: mostRecentVisit.branch.name,
            },
            occurredAt: lastVisitOccurredAt!,
          }
        : null,
      daysSinceLastVisit,
      visitorType: resolveVisitorType(visits.length, daysSinceLastVisit),
      visitFrequency: resolveVisitFrequency(visitsInLast12Months),
    },
  };
}

function resolveLastVisitOccurredAt(visit: {
  checkedOutAt: Date | null;
  checkedInAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
}): Date {
  return (
    visit.checkedOutAt ??
    visit.checkedInAt ??
    visit.scheduledAt ??
    visit.createdAt
  );
}
