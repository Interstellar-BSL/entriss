import { VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { visitInclude } from "./internal/visit-include";
import type { VisitorType } from "./visitor-insights.service";

const RECENT_LIMIT = 20;
const DORMANT_DAYS = 180;

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

function resolveActivityAt(
  updatedAt: Date,
  checkedInAt: Date | null,
  checkedOutAt: Date | null,
  createdAt: Date,
): Date {
  const candidates = [updatedAt, checkedInAt, checkedOutAt, createdAt].filter(
    (value): value is Date => value instanceof Date,
  );

  return candidates.reduce((latest, value) =>
    value.getTime() > latest.getTime() ? value : latest,
  );
}

export interface RecentVisitorEntry {
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    photoUrl: string | null;
  };
  lastVisitAt: Date;
  lastHost: {
    id: string;
    name: string;
  };
  lastBranch: {
    id: string;
    name: string;
  };
  visitCount: number;
  visitorType: VisitorType;
  activeVisitId: string | null;
  latestVisitId: string;
  latestVisitStatus: VisitStatus;
}

export async function getRecentVisitors(
  ctx: TenantContext,
): Promise<RecentVisitorEntry[]> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visitStats = await prisma.visit.groupBy({
    by: ["visitorId"],
    where: { organizationId: ctx.organizationId },
    _count: { _all: true },
    _max: {
      updatedAt: true,
      createdAt: true,
      checkedInAt: true,
      checkedOutAt: true,
    },
  });

  const ranked = visitStats
    .map((row) => ({
      visitorId: row.visitorId,
      visitCount: row._count._all,
      lastVisitAt: resolveActivityAt(
        row._max.updatedAt ?? row._max.createdAt!,
        row._max.checkedInAt,
        row._max.checkedOutAt,
        row._max.createdAt!,
      ),
    }))
    .sort((left, right) => right.lastVisitAt.getTime() - left.lastVisitAt.getTime())
    .slice(0, RECENT_LIMIT);

  if (ranked.length === 0) {
    return [];
  }

  const visitorIds = ranked.map((row) => row.visitorId);

  const [visitors, latestVisits, activeVisits] = await Promise.all([
    prisma.visitor.findMany({
      where: {
        organizationId: ctx.organizationId,
        id: { in: visitorIds },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        photoUrl: true,
      },
    }),
    prisma.visit.findMany({
      where: {
        organizationId: ctx.organizationId,
        visitorId: { in: visitorIds },
      },
      include: visitInclude,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.visit.findMany({
      where: {
        organizationId: ctx.organizationId,
        visitorId: { in: visitorIds },
        status: VisitStatus.CHECKED_IN,
      },
      select: { id: true, visitorId: true },
    }),
  ]);

  const visitorMap = new Map(visitors.map((visitor) => [visitor.id, visitor]));
  const latestVisitMap = new Map<string, (typeof latestVisits)[number]>();
  const activeVisitMap = new Map(
    activeVisits.map((visit) => [visit.visitorId, visit.id]),
  );

  for (const visit of latestVisits) {
    if (!latestVisitMap.has(visit.visitorId)) {
      latestVisitMap.set(visit.visitorId, visit);
    }
  }

  return ranked.flatMap((row) => {
    const visitor = visitorMap.get(row.visitorId);
    const latestVisit = latestVisitMap.get(row.visitorId);
    if (!visitor || !latestVisit) {
      return [];
    }

    const entry: RecentVisitorEntry = {
      visitor: {
        id: visitor.id,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        email: visitor.email,
        phone: visitor.phone,
        company: visitor.company,
        photoUrl: visitor.photoUrl,
      },
      lastVisitAt: row.lastVisitAt,
      lastHost: {
        id: latestVisit.host.id,
        name: hostDisplayName(latestVisit.host),
      },
      lastBranch: {
        id: latestVisit.branch.id,
        name: latestVisit.branch.name,
      },
      visitCount: row.visitCount,
      visitorType: resolveVisitorType(
        row.visitCount,
        computeDaysSince(row.lastVisitAt),
      ),
      activeVisitId: activeVisitMap.get(visitor.id) ?? null,
      latestVisitId: latestVisit.id,
      latestVisitStatus: latestVisit.status,
    };

    return [entry];
  });
}
