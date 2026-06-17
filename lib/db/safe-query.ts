import type { TenantContext } from "@/lib/tenant/tenant-context";

import { orgIdFilter, withOrgScope } from "@/lib/tenant/org-scope";

/**
 * Runs a query with a fallback value. Logs errors without throwing.
 * Used for platform-admin metrics that must not break the dashboard.
 */
export async function safeQuery<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
  errors?: string[],
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("[safeQuery]", label, error);
    errors?.push(label);
    return fallback;
  }
}

type WhereInput = Record<string, unknown>;

function warnUnscopedQuery(modelName: string, operation: string) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`⚠️ UNSCOPED QUERY DETECTED: ${modelName}.${operation}`);
  }
}

function mergeOrgWhere<T extends WhereInput>(
  ctx: TenantContext,
  where?: T,
): T & { organizationId: string } {
  return withOrgScope(ctx, where);
}

export function scopedWhere<T extends WhereInput>(
  ctx: TenantContext,
  where?: T,
) {
  return mergeOrgWhere(ctx, where);
}

export type ScopedModel<T> = {
  findMany: (args?: unknown) => Promise<T[]>;
  findFirst?: (args?: unknown) => Promise<T | null>;
  count?: (args?: unknown) => Promise<number>;
};

export function safeFindMany<T>(
  ctx: TenantContext,
  model: ScopedModel<T>,
  modelName: string,
  args: { where?: WhereInput } & Record<string, unknown> = {},
): Promise<T[]> {
  if (!args.where?.organizationId) {
    warnUnscopedQuery(modelName, "findMany");
  }

  return model.findMany({
    ...args,
    where: mergeOrgWhere(ctx, args.where),
  });
}

export function safeFindFirst<T>(
  ctx: TenantContext,
  model: ScopedModel<T>,
  modelName: string,
  args: { where?: WhereInput } & Record<string, unknown> = {},
): Promise<T | null> {
  if (!model.findFirst) {
    throw new Error(`${modelName} does not support findFirst`);
  }

  if (!args.where?.organizationId) {
    warnUnscopedQuery(modelName, "findFirst");
  }

  return model.findFirst({
    ...args,
    where: mergeOrgWhere(ctx, args.where),
  });
}

export function safeCount(
  ctx: TenantContext,
  model: { count: (args?: unknown) => Promise<number> },
  modelName: string,
  args: { where?: WhereInput } & Record<string, unknown> = {},
): Promise<number> {
  if (!args.where?.organizationId) {
    warnUnscopedQuery(modelName, "count");
  }

  return model.count({
    ...args,
    where: mergeOrgWhere(ctx, args.where),
  });
}

export function tenantWhere(ctx: TenantContext) {
  return orgIdFilter(ctx);
}
