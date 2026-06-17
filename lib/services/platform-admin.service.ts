import { prisma } from "@/lib/db/client";
import { safeQuery } from "@/lib/db/safe-query";
import { writePlatformAuditLog } from "@/lib/platform/audit";
import { emitPlatformNotification } from "@/lib/notifications/platform-projector";
import { writeAuditLog } from "@/lib/audit/logger";

import { ServiceError } from "./errors";

export async function getPlatformDashboardMetrics() {
  const unavailableMetrics: string[] = [];

  const totalOrganizations = await safeQuery(
    "totalOrganizations",
    () => prisma.organization.count({ where: { deletedAt: null } }),
    0,
    unavailableMetrics,
  );

  const pendingRequests = await safeQuery(
    "pendingRequests",
    () => prisma.organizationRequest.count({ where: { status: "PENDING" } }),
    0,
    unavailableMetrics,
  );

  const approvedOrganizations = await safeQuery(
    "approvedOrganizations",
    () =>
      prisma.organization.count({
        where: { status: "APPROVED", deletedAt: null },
      }),
    0,
    unavailableMetrics,
  );

  const suspendedOrganizations = await safeQuery(
    "suspendedOrganizations",
    () =>
      prisma.organization.count({
        where: { status: "SUSPENDED", deletedAt: null },
      }),
    0,
    unavailableMetrics,
  );

  const totalVisitors = await safeQuery(
    "totalVisitors",
    () => prisma.visitor.count({ where: { deletedAt: null } }),
    0,
    unavailableMetrics,
  );

  const totalVisits = await safeQuery(
    "totalVisits",
    () => prisma.visit.count(),
    0,
    unavailableMetrics,
  );

  const activeOrganizations = await safeQuery(
    "activeOrganizations",
    () =>
      prisma.organization.count({
        where: {
          status: "APPROVED",
          deletedAt: null,
          members: { some: { isActive: true, status: "ACTIVE" } },
        },
      }),
    0,
    unavailableMetrics,
  );

  const lastOrganization = await safeQuery(
    "lastOrganization",
    () =>
      prisma.organization.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { name: true, createdAt: true },
      }),
    null,
    unavailableMetrics,
  );

  const lastLogin = await safeQuery(
    "lastLogin",
    () =>
      prisma.user.findFirst({
        where: { lastLoginAt: { not: null }, deletedAt: null },
        orderBy: { lastLoginAt: "desc" },
        select: { email: true, lastLoginAt: true },
      }),
    null,
    unavailableMetrics,
  );

  return {
    totalOrganizations,
    pendingRequests,
    approvedOrganizations,
    suspendedOrganizations,
    usage: {
      totalVisitors,
      totalVisits,
      activeOrganizations,
    },
    health: {
      lastOrganizationCreatedAt: lastOrganization?.createdAt.toISOString() ?? null,
      lastOrganizationName: lastOrganization?.name ?? null,
      lastLoginAt: lastLogin?.lastLoginAt?.toISOString() ?? null,
      lastLoginEmail: lastLogin?.email ?? null,
      systemStatus: unavailableMetrics.length > 0 ? "degraded" : "operational",
    },
    degraded: unavailableMetrics.length > 0,
    unavailableMetrics,
  };
}

export async function listPlatformOrganizations() {
  const unavailableMetrics: string[] = [];

  const organizations = await safeQuery(
    "listPlatformOrganizations",
    () =>
      prisma.organization.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
      }),
    [],
    unavailableMetrics,
  );

  return {
    items: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      createdAt: organization.createdAt.toISOString(),
      userCount: organization._count.members,
    })),
    degraded: unavailableMetrics.length > 0,
    unavailableMetrics,
  };
}

export async function getPlatformOrganizationDetail(organizationId: string) {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    include: {
      members: {
        where: { isActive: true, status: "ACTIVE" },
        include: {
          user: { select: { id: true, email: true, name: true, lastLoginAt: true } },
          role: { select: { name: true, slug: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          actor: { select: { id: true, email: true, name: true } },
        },
      },
      _count: {
        select: {
          visits: true,
          branches: true,
          members: true,
        },
      },
    },
  });

  if (!organization) {
    throw new ServiceError("ORGANIZATION_NOT_FOUND", "Organization not found");
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    visitCount: organization._count.visits,
    branchCount: organization._count.branches,
    userCount: organization._count.members,
    users: organization.members.map((membership) => ({
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      role: membership.role.name,
      lastLoginAt: membership.user.lastLoginAt?.toISOString() ?? null,
      joinedAt: membership.joinedAt.toISOString(),
    })),
    recentActivity: organization.auditLogs.map((entry) => ({
      id: entry.id,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      createdAt: entry.createdAt.toISOString(),
      actor: entry.actor
        ? {
            id: entry.actor.id,
            email: entry.actor.email,
            name: entry.actor.name,
          }
        : null,
      metadata: entry.metadata,
    })),
  };
}

export async function suspendOrganization(
  organizationId: string,
  actorId: string,
) {
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: { status: "SUSPENDED", isActive: false },
    select: { id: true, name: true },
  });

  await writeAuditLog({
    organizationId,
    actorId,
    action: "ORG_SUSPENDED",
    resourceType: "Organization",
    resourceId: organizationId,
  });

  await writePlatformAuditLog({
    actorId,
    action: "ORG_SUSPENDED",
    resourceType: "Organization",
    resourceId: organizationId,
    organizationId,
    metadata: { name: organization.name },
  });

  emitPlatformNotification({
    kind: "ORG_SUSPENDED",
    organizationId: organization.id,
    organizationName: organization.name,
  });

  return organization;
}

export async function reactivateOrganization(
  organizationId: string,
  actorId: string,
) {
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: { status: "APPROVED", isActive: true, deletedAt: null },
    select: { id: true, name: true },
  });

  await writeAuditLog({
    organizationId,
    actorId,
    action: "ORG_REACTIVATED",
    resourceType: "Organization",
    resourceId: organizationId,
  });

  await writePlatformAuditLog({
    actorId,
    action: "ORG_REACTIVATED",
    resourceType: "Organization",
    resourceId: organizationId,
    organizationId,
    metadata: { name: organization.name },
  });

  return organization;
}
