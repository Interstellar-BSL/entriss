import type { MemberStatus, OrgStatus, SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { ALL_PERMISSIONS } from "@/lib/rbac/permissions";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant/constants";

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface OrganizationContext {
  organizationId: string | null;
  organization: ActiveOrganization | null;
  organizationStatus: OrgStatus | null;
  role: string | null;
  memberId: string | null;
  roleId: string | null;
  permissions: string[];
}

const activeOrganizationSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  isActive: true,
  deletedAt: true,
} as const;

export function isOrganizationApproved(organization: {
  isActive: boolean;
  deletedAt: Date | null;
  status: OrgStatus;
}): boolean {
  return (
    organization.isActive &&
    organization.status === "APPROVED" &&
    organization.deletedAt === null
  );
}

function isMembershipAccessible(membership: {
  isActive: boolean;
  status: MemberStatus;
}): boolean {
  return membership.isActive && membership.status === "ACTIVE";
}

async function loadAllPermissionSlugs(): Promise<string[]> {
  const permissions = await prisma.permission.findMany({
    select: { slug: true },
    orderBy: { slug: "asc" },
  });

  if (permissions.length > 0) {
    return permissions.map((permission) => permission.slug);
  }

  return [...ALL_PERMISSIONS];
}

/**
 * Each user belongs to exactly one organization — resolved from their membership.
 */
export async function resolveUserOrganizationId(
  userId: string,
  systemRole: SystemRole | null,
): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      isActive: true,
      status: "ACTIVE",
    },
    orderBy: { joinedAt: "asc" },
    select: { organizationId: true },
  });

  if (membership) {
    return membership.organizationId;
  }

  if (systemRole === "SYSTEM_OWNER") {
    const organization = await prisma.organization.findFirst({
      where: { id: DEFAULT_ORGANIZATION_ID, deletedAt: null },
      select: { id: true },
    });
    return organization?.id ?? null;
  }

  return null;
}

export async function userCanAccessOrganization(
  userId: string,
  organizationId: string,
  systemRole: SystemRole | null,
): Promise<boolean> {
  const resolvedOrganizationId = await resolveUserOrganizationId(userId, systemRole);
  if (resolvedOrganizationId !== organizationId) {
    return false;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { isActive: true, deletedAt: true, status: true },
  });

  return organization ? isOrganizationApproved(organization) : false;
}

/**
 * Loads tenant-scoped role and permissions for the user's organization.
 */
export async function loadOrganizationContext(
  userId: string,
  systemRole: SystemRole | null,
): Promise<OrganizationContext> {
  const organizationId = await resolveUserOrganizationId(userId, systemRole);

  if (!organizationId) {
    return {
      organizationId: null,
      organization: null,
      organizationStatus: null,
      role: null,
      memberId: null,
      roleId: null,
      permissions: [],
    };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: activeOrganizationSelect,
  });

  if (!organization) {
    return {
      organizationId: null,
      organization: null,
      organizationStatus: null,
      role: null,
      memberId: null,
      roleId: null,
      permissions: [],
    };
  }

  const activeOrganization: ActiveOrganization = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
  };

  if (!isOrganizationApproved(organization)) {
    return {
      organizationId: organization.id,
      organization: activeOrganization,
      organizationStatus: organization.status,
      role: null,
      memberId: null,
      roleId: null,
      permissions: [],
    };
  }

  if (systemRole === "SYSTEM_OWNER") {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: { role: { select: { name: true } } },
    });

    return {
      organizationId,
      organization: activeOrganization,
      organizationStatus: organization.status,
      role:
        membership && isMembershipAccessible(membership)
          ? membership.role.name
          : "System Owner",
      memberId:
        membership && isMembershipAccessible(membership) ? membership.id : null,
      roleId:
        membership && isMembershipAccessible(membership)
          ? membership.roleId
          : null,
      permissions: await loadAllPermissionSlugs(),
    };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      isActive: true,
      status: "ACTIVE",
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: {
                select: { slug: true },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return {
      organizationId: null,
      organization: null,
      organizationStatus: null,
      role: null,
      memberId: null,
      roleId: null,
      permissions: [],
    };
  }

  const permissions = membership.role.permissions.map(
    (entry) => entry.permission.slug,
  );

  return {
    organizationId,
    organization: activeOrganization,
    organizationStatus: organization.status,
    role: membership.role.name,
    memberId: membership.id,
    roleId: membership.roleId,
    permissions,
  };
}

export async function getOrganizationById(organizationId: string) {
  return prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isActive: true,
    },
  });
}
