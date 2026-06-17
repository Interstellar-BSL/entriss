import type { DbExecutor } from "@/lib/db/transaction";
import {
  PERMISSION_DEFINITIONS,
  type Permission,
} from "@/lib/rbac/permissions";

export type PermissionIdMap = Map<Permission, string>;

/**
 * Seeds the global permission catalog. Idempotent — safe to run multiple times.
 */
export async function seedPermissions(
  db: DbExecutor,
): Promise<PermissionIdMap> {
  const permissionIds: PermissionIdMap = new Map();

  for (const definition of PERMISSION_DEFINITIONS) {
    const permission = await db.permission.upsert({
      where: { slug: definition.slug },
      create: {
        slug: definition.slug,
        description: definition.description,
      },
      update: {
        description: definition.description,
      },
    });

    permissionIds.set(definition.slug, permission.id);
  }

  return permissionIds;
}

export async function getPermissionIdMap(
  db: DbExecutor,
): Promise<PermissionIdMap> {
  const permissions = await db.permission.findMany({
    select: { id: true, slug: true },
  });

  return new Map(
    permissions.map((permission) => [
      permission.slug as Permission,
      permission.id,
    ]),
  );
}
