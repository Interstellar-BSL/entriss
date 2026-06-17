import { VisitStatus } from "@prisma/client";
import { resolveHostDisplayName } from "@/lib/hosts/display";
import { prisma } from "@/lib/db/client";
import { calculateStatusBreakdown } from "@/lib/analytics/query/kpi-calculators";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import type { AnalyticsDateRange } from "./date-ranges";

export interface AnalyticsVisitRow {
  id: string;
  visitorId: string;
  branchId: string;
  hostMemberId: string;
  status: VisitStatus;
  scheduledAt: Date | null;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  createdAt: Date;
  branch: { id: string; name: string };
  host: {
    id: string;
    user: { name: string | null; email: string };
  };
}

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

export function aggregateStatusBreakdown(
  visits: AnalyticsVisitRow[],
): VisitStatusBreakdown {
  return calculateStatusBreakdown(visits);
}

export function resolveActivityTimestamp(visit: AnalyticsVisitRow) {
  return visit.checkedInAt ?? visit.createdAt;
}

export async function loadAnalyticsVisitRows(
  ctx: TenantContext,
  range: AnalyticsDateRange,
  branchId?: string,
): Promise<AnalyticsVisitRow[]> {
  return prisma.visit.findMany({
    where: {
      organizationId: ctx.organizationId,
      createdAt: {
        gte: range.from,
        lte: range.to,
      },
      ...(branchId ? { branchId } : {}),
    },
    select: {
      id: true,
      visitorId: true,
      branchId: true,
      hostMemberId: true,
      status: true,
      scheduledAt: true,
      checkedInAt: true,
      checkedOutAt: true,
      createdAt: true,
      branch: {
        select: { id: true, name: true },
      },
      host: {
        select: {
          id: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function hostDisplayName(host: {
  user: { name: string | null; email: string };
}) {
  return resolveHostDisplayName(host);
}

export function computeDurationMinutes(
  checkedInAt: Date | null,
  checkedOutAt: Date | null,
) {
  if (!checkedInAt || !checkedOutAt) {
    return null;
  }

  const durationMs = checkedOutAt.getTime() - checkedInAt.getTime();
  if (durationMs < 0) {
    return null;
  }

  return Math.round(durationMs / 60_000);
}
