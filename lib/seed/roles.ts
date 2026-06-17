import type { Permission } from "@/lib/rbac/permissions";
import {
  DEFAULT_ROLES,
  SYSTEM_ROLE_SLUGS,
  type SystemRoleSlug,
} from "@/lib/rbac/roles";
import type { DbExecutor } from "@/lib/db/transaction";
import { initializeOrganizationSettingsRecord } from "@/lib/settings/initialize";

import { seedPermissions, type PermissionIdMap } from "./permissions";

export type OrganizationRoleIdMap = Map<SystemRoleSlug, string>;

export class RoleProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleProvisioningError";
  }
}

async function assertOrganizationExists(
  db: DbExecutor,
  organizationId: string,
): Promise<void> {
  const organization = await db.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: { id: true },
  });

  if (!organization) {
    throw new RoleProvisioningError(
      `Organization ${organizationId} must exist before assigning role permissions`,
    );
  }
}

function resolveDesiredPermissionIds(
  desiredPermissions: Permission[],
  permissionMap: PermissionIdMap,
): string[] {
  return desiredPermissions.map((slug) => {
    const permissionId = permissionMap.get(slug);
    if (!permissionId) {
      throw new RoleProvisioningError(`Permission not found in catalog: ${slug}`);
    }
    return permissionId;
  });
}

async function syncRolePermissions(
  db: DbExecutor,
  organizationId: string,
  roleId: string,
  desiredPermissions: Permission[],
  permissionMap: PermissionIdMap,
  existingPermissionIds: Set<string>,
): Promise<void> {
  const desiredPermissionIds = resolveDesiredPermissionIds(
    desiredPermissions,
    permissionMap,
  );
  const desiredSet = new Set(desiredPermissionIds);

  console.log("[ROLE ASSIGN] orgId =", organizationId, "roleId =", roleId);
  console.log("[ROLE ASSIGN] permissionIds =", desiredPermissionIds);

  const permissionIdsToRemove = [...existingPermissionIds].filter(
    (permissionId) => !desiredSet.has(permissionId),
  );

  if (permissionIdsToRemove.length > 0) {
    await db.rolePermission.deleteMany({
      where: {
        roleId,
        organizationId,
        permissionId: { in: permissionIdsToRemove },
      },
    });
  }

  const permissionIdsToAdd = desiredPermissionIds.filter(
    (permissionId) => !existingPermissionIds.has(permissionId),
  );

  if (permissionIdsToAdd.length > 0) {
    await db.rolePermission.createMany({
      data: permissionIdsToAdd.map((permissionId) => ({
        organizationId,
        roleId,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  if (desiredPermissionIds.length > 0) {
    await db.rolePermission.updateMany({
      where: {
        roleId,
        permissionId: { in: desiredPermissionIds },
      },
      data: { organizationId },
    });
  }
}

/**
 * Seeds default org-scoped roles and permission mappings. Idempotent.
 */
export async function seedRoles(
  db: DbExecutor,
  organizationId: string,
  permissionMap: PermissionIdMap,
): Promise<OrganizationRoleIdMap> {
  await assertOrganizationExists(db, organizationId);

  const existingRows = await db.rolePermission.findMany({
    where: { organizationId },
    select: { roleId: true, permissionId: true },
  });

  const existingByRoleId = new Map<string, Set<string>>();
  for (const row of existingRows) {
    const bucket = existingByRoleId.get(row.roleId) ?? new Set<string>();
    bucket.add(row.permissionId);
    existingByRoleId.set(row.roleId, bucket);
  }

  const roleIds: OrganizationRoleIdMap = new Map();

  for (const roleDefinition of DEFAULT_ROLES) {
    const role = await db.role.upsert({
      where: {
        organizationId_slug: {
          organizationId,
          slug: roleDefinition.slug,
        },
      },
      create: {
        organizationId,
        name: roleDefinition.name,
        slug: roleDefinition.slug,
        description: roleDefinition.description,
        isSystem: true,
      },
      update: {
        name: roleDefinition.name,
        description: roleDefinition.description,
        isSystem: true,
        organizationId,
      },
      select: { id: true, organizationId: true, slug: true },
    });

    const roleOrganizationId = role.organizationId;

    if (!roleOrganizationId) {
      throw new RoleProvisioningError(
        `Role ${roleDefinition.slug} is not organization-scoped; cannot assign permissions`,
      );
    }

    if (roleOrganizationId !== organizationId) {
      throw new RoleProvisioningError(
        `Role ${roleDefinition.slug} organization mismatch (expected ${organizationId}, got ${roleOrganizationId})`,
      );
    }

    await syncRolePermissions(
      db,
      roleOrganizationId,
      role.id,
      roleDefinition.permissions,
      permissionMap,
      existingByRoleId.get(role.id) ?? new Set(),
    );

    roleIds.set(roleDefinition.slug, role.id);
  }

  return roleIds;
}

/**
 * Provisions default roles for a new organization.
 * Call this from signup / org-creation flows after the organization row exists.
 */
export async function createOrganizationDefaults(
  db: DbExecutor,
  organizationId: string,
  options?: { permissionMap?: PermissionIdMap },
): Promise<OrganizationRoleIdMap> {
  const permissionMap =
    options?.permissionMap ?? (await seedPermissions(db));

  if (permissionMap.size === 0) {
    throw new RoleProvisioningError(
      "Permission catalog is empty. Check PERMISSION_DEFINITIONS in lib/rbac/permissions.ts.",
    );
  }

  await assertOrganizationExists(db, organizationId);
  await initializeOrganizationSettingsRecord(db, organizationId);
  return seedRoles(db, organizationId, permissionMap);
}

/**
 * Assigns default roles and permissions after the organization row is committed.
 * Must run outside interactive transactions.
 */
export async function assignOrganizationRolePermissions(
  db: DbExecutor,
  organizationId: string,
  options?: { permissionMap?: PermissionIdMap },
): Promise<OrganizationRoleIdMap> {
  return createOrganizationDefaults(db, organizationId, options);
}

export { SYSTEM_ROLE_SLUGS };
