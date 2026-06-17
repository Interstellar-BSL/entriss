import "server-only";

import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { DEFAULT_ROLES, SYSTEM_ROLE_SLUGS } from "@/lib/rbac/roles";
import type { TenantContext } from "@/lib/tenant/tenant-context";

const HOST_ROLE_DEFINITION = DEFAULT_ROLES.find(
  (role) => role.slug === SYSTEM_ROLE_SLUGS.HOST,
);

export async function ensureHostRoleId(organizationId: string): Promise<string> {
  const existing = await prisma.role.findFirst({
    where: {
      organizationId,
      slug: SYSTEM_ROLE_SLUGS.HOST,
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  if (!HOST_ROLE_DEFINITION) {
    throw new Error("Host role definition is missing from DEFAULT_ROLES");
  }

  const permissionRows = await prisma.permission.findMany({
    where: {
      slug: { in: HOST_ROLE_DEFINITION.permissions },
    },
    select: { id: true, slug: true },
  });

  const role = await prisma.role.create({
    data: {
      organizationId,
      name: HOST_ROLE_DEFINITION.name,
      slug: HOST_ROLE_DEFINITION.slug,
      description: HOST_ROLE_DEFINITION.description,
      isSystem: true,
    },
    select: { id: true },
  });

  if (permissionRows.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionRows.map((permission) => ({
        organizationId,
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }

  return role.id;
}

export async function ensureHostRoleIdForContext(
  ctx: TenantContext,
): Promise<string> {
  return ensureHostRoleId(ctx.organizationId);
}
