import type { TenantContext } from "./tenant-context";

/**
 * Merges tenant scope into a Prisma `where` clause.
 * Every tenant-owned query should include `organizationId`.
 */
export function withOrgScope<T extends Record<string, unknown>>(
  ctx: TenantContext,
  where?: T,
): T & { organizationId: string } {
  return {
    ...(where ?? ({} as T)),
    organizationId: ctx.organizationId,
  };
}

/**
 * Merges tenant scope into a Prisma `data` payload for creates/updates.
 */
export function withOrgScopeData<T extends Record<string, unknown>>(
  ctx: TenantContext,
  data: T,
): T & { organizationId: string } {
  return {
    ...data,
    organizationId: ctx.organizationId,
  };
}

/**
 * Returns only the organizationId filter for minimal where clauses.
 */
export function orgIdFilter(ctx: TenantContext) {
  return { organizationId: ctx.organizationId } as const;
}
