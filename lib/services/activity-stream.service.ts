import type { Prisma } from "@prisma/client";
import {
  mapAuditLogToActivityItem,
  mapVisitEventToActivityItem,
} from "@/lib/activity/mappers";
import type {
  ActivityCategory,
  ActivityItem,
  ActivityStreamFilters,
  ActivityStreamResult,
} from "@/lib/activity/types";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export type { ActivityItem, ActivityStreamFilters, ActivityStreamResult } from "@/lib/activity/types";

function buildDateRange(
  from?: Date,
  to?: Date,
): Prisma.DateTimeFilter | undefined {
  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

async function resolveVisitIdsForVisitor(
  organizationId: string,
  visitorId: string,
): Promise<string[]> {
  const visits = await prisma.visit.findMany({
    where: {
      organizationId,
      visitorId,
    },
    select: { id: true },
  });

  return visits.map((visit) => visit.id);
}

async function resolveVisitIdsForBranch(
  organizationId: string,
  branchId: string,
): Promise<string[]> {
  const visits = await prisma.visit.findMany({
    where: {
      organizationId,
      branchId,
    },
    select: { id: true },
  });

  return visits.map((visit) => visit.id);
}

async function loadVisitEventActivity(
  organizationId: string,
  filters: ActivityStreamFilters,
  take: number,
) {
  const createdAt = buildDateRange(filters.from, filters.to);

  const visitEventWhere: Prisma.VisitEventWhereInput = {
    organizationId,
    ...(filters.visitId ? { visitId: filters.visitId } : {}),
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(createdAt ? { createdAt } : {}),
    visit: {
      ...(filters.visitorId ? { visitorId: filters.visitorId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    },
  };

  const events = await prisma.visitEvent.findMany({
    where: visitEventWhere,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      visit: {
        select: {
          id: true,
          branchId: true,
          visitor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return events.map(mapVisitEventToActivityItem);
}

async function loadAuditLogActivity(
  organizationId: string,
  filters: ActivityStreamFilters,
  take: number,
) {
  const createdAt = buildDateRange(filters.from, filters.to);
  const orConditions: Prisma.AuditLogWhereInput[] = [];

  if (filters.visitId) {
    orConditions.push({
      resourceType: "Visit",
      resourceId: filters.visitId,
    });
  }

  if (filters.visitorId) {
    const visitIds = await resolveVisitIdsForVisitor(
      organizationId,
      filters.visitorId,
    );

    orConditions.push({
      resourceType: "Visitor",
      resourceId: filters.visitorId,
    });

    if (visitIds.length > 0) {
      orConditions.push({
        resourceType: "Visit",
        resourceId: { in: visitIds },
      });
    }
  }

  if (filters.branchId) {
    const visitIds = await resolveVisitIdsForBranch(
      organizationId,
      filters.branchId,
    );

    if (visitIds.length > 0) {
      orConditions.push({
        resourceType: "Visit",
        resourceId: { in: visitIds },
      });
    } else {
      return [];
    }
  }

  const auditWhere: Prisma.AuditLogWhereInput = {
    organizationId,
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    ...(filters.visitId && orConditions.length === 0
      ? {
          resourceType: "Visit",
          resourceId: filters.visitId,
        }
      : {}),
  };

  const logs = await prisma.auditLog.findMany({
    where: auditWhere,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const visitResourceIds = logs
    .filter((log) => log.resourceType.toLowerCase() === "visit")
    .map((log) => log.resourceId);

  const visitorResourceIds = logs
    .filter((log) => log.resourceType.toLowerCase() === "visitor")
    .map((log) => log.resourceId);

  const [visits, visitors] = await Promise.all([
    visitResourceIds.length > 0
      ? prisma.visit.findMany({
          where: {
            organizationId,
            id: { in: visitResourceIds },
          },
          select: {
            id: true,
            visitorId: true,
            branchId: true,
            visitor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    visitorResourceIds.length > 0
      ? prisma.visitor.findMany({
          where: {
            organizationId,
            id: { in: visitorResourceIds },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const visitById = new Map(visits.map((visit) => [visit.id, visit]));
  const visitorById = new Map(
    visitors.map((visitor) => [visitor.id, visitor]),
  );

  return logs.map((log) =>
    mapAuditLogToActivityItem({
      ...log,
      visit:
        log.resourceType.toLowerCase() === "visit"
          ? visitById.get(log.resourceId) ?? null
          : null,
      visitor:
        log.resourceType.toLowerCase() === "visitor"
          ? visitorById.get(log.resourceId) ?? null
          : null,
    }),
  );
}

function mergeActivityItems(items: ActivityItem[], limit: number) {
  return items
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, limit);
}

export async function getActivityStream(
  ctx: TenantContext,
  filters: Omit<ActivityStreamFilters, "organizationId"> = {},
): Promise<ActivityStreamResult> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const organizationId = ctx.organizationId;
  const scopedFilters: ActivityStreamFilters = {
    ...filters,
    organizationId,
  };

  const category = filters.category as ActivityCategory | undefined;
  const includeVisitEvents = !category || category === "visit";
  const includeAuditLogs = !category || category !== "visit";

  const [visitItems, auditItems] = await Promise.all([
    includeVisitEvents
      ? loadVisitEventActivity(organizationId, scopedFilters, limit)
      : Promise.resolve([]),
    includeAuditLogs
      ? loadAuditLogActivity(organizationId, scopedFilters, limit)
      : Promise.resolve([]),
  ]);

  let items = mergeActivityItems([...visitItems, ...auditItems], limit);

  if (category) {
    items = items.filter((item) => item.category === category);
  }

  return { items };
}
