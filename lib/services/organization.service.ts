import { prisma } from "@/lib/db/client";
import { isPrismaKnownRequestError } from "@/lib/db/prisma-errors";
import { writeAuditLog } from "@/lib/audit/logger";
import { assignOrganizationRolePermissions, SYSTEM_ROLE_SLUGS } from "@/lib/seed/roles";
import { seedPermissions } from "@/lib/seed/permissions";
import type { ActiveOrganization } from "@/lib/tenant/resolve-organization";
import type { CreateOrganizationInput } from "@/lib/validations/organization";

import { ServiceError } from "./errors";
import { slugifyOrganizationName } from "./org-slug";

const INVITE_TTL_DAYS = 7;

export { INVITE_TTL_DAYS };

async function resolveUniqueOrganizationSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prisma.organization.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    const suffix = `-${counter}`;
    slug = `${baseSlug.slice(0, Math.max(1, 100 - suffix.length))}${suffix}`;
    counter += 1;
  }
}

export interface CreateOrganizationResult {
  organization: ActiveOrganization;
  organizationId: string;
  organizationStatus: "PENDING";
  memberId: string;
  roleId: string;
}

export async function createOrganization(
  userId: string,
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  const existingMembership = await prisma.organizationMember.findFirst({
    where: { userId, isActive: true, status: "ACTIVE" },
    select: { id: true },
  });

  if (existingMembership) {
    throw new ServiceError(
      "ORG_ALREADY_ASSIGNED",
      "You are already assigned to an organization",
    );
  }

  const baseSlug = input.slug ?? slugifyOrganizationName(input.name);
  const slug = await resolveUniqueOrganizationSlug(baseSlug);
  const permissionMap = await seedPermissions(prisma);

  try {
    const created = await prisma.$transaction(
      async (tx) =>
        tx.organization.create({
          data: {
            name: input.name.trim(),
            slug,
            settings: { createdBy: userId },
            status: "PENDING",
            isActive: true,
          },
          select: { id: true, name: true, slug: true, status: true },
        }),
      { timeout: 15_000, maxWait: 5_000 },
    );

    const roleIds = await assignOrganizationRolePermissions(prisma, created.id, {
      permissionMap,
    });
    const ownerRoleId = roleIds.get(SYSTEM_ROLE_SLUGS.OWNER);

    if (!ownerRoleId) {
      throw new ServiceError(
        "ORG_PROVISION_FAILED",
        "Owner role was not provisioned for the new organization",
      );
    }

    const membership = await prisma.organizationMember.create({
      data: {
        organizationId: created.id,
        userId,
        roleId: ownerRoleId,
        status: "ACTIVE",
        isActive: true,
      },
      select: { id: true, roleId: true },
    });

    try {
      await writeAuditLog({
        organizationId: created.id,
        actorId: userId,
        action: "ORGANIZATION_CREATED",
        resourceType: "Organization",
        resourceId: created.id,
        metadata: { name: created.name, slug: created.slug, status: created.status },
      });
    } catch (auditError) {
      console.error("[organization] create audit failed:", auditError);
    }

    return {
      organization: {
        id: created.id,
        name: created.name,
        slug: created.slug,
      },
      organizationId: created.id,
      organizationStatus: "PENDING" as const,
      memberId: membership.id,
      roleId: membership.roleId,
    };
  } catch (error) {
    if (isPrismaKnownRequestError(error) && error.code === "P2002") {
      throw new ServiceError(
        "ORG_SLUG_TAKEN",
        "An organization with this slug already exists",
      );
    }
    throw error;
  }
}

export async function getOrganizationById(organizationId: string) {
  return prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: { id: true, name: true, slug: true, status: true, isActive: true },
  });
}
