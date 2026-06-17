import type { Visitor } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import {
  createVisitorSchema,
  findVisitorSchema,
  getOrCreateVisitorSchema,
  normalizePhone,
  resolveVisitorIdentitySchema,
  type CreateVisitorInput,
  type CreateVisitorRequestInput,
  type FindVisitorInput,
  type GetOrCreateVisitorInput,
  type ResolveVisitorIdentityInput,
} from "@/lib/validations/visitor";

import { buildPaginatedResult, type PaginatedResult } from "@/lib/api/pagination";

import { VisitorIdentityConflictError, VisitorNotFoundError } from "./errors";

function tenantVisitorWhere(ctx: TenantContext) {
  return {
    organizationId: ctx.organizationId,
    deletedAt: null,
    isActive: true,
  } as const;
}

export async function createVisitor(
  ctx: TenantContext,
  input: CreateVisitorInput,
): Promise<Visitor> {
  requirePermission(ctx, PERMISSIONS.VISITOR_CREATE);

  const data = createVisitorSchema.parse(input);

  return prisma.visitor.create({
    data: {
      organizationId: ctx.organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      photoUrl: data.photoUrl ?? null,
      notes: data.notes ?? null,
    },
  });
}

export interface VisitorVisitSummary {
  visitCount: number;
  lastVisitAt: Date | null;
}

/**
 * Read-only identity lookup for staff flows.
 * Matches by normalized email (preferred) or normalized phone within the tenant.
 */
export async function findExistingVisitorByIdentity(
  ctx: TenantContext,
  input: ResolveVisitorIdentityInput,
): Promise<Visitor | null> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const criteria = resolveVisitorIdentitySchema.parse(input);

  if (criteria.email) {
    const byEmail = await prisma.visitor.findFirst({
      where: {
        ...tenantVisitorWhere(ctx),
        email: criteria.email,
      },
    });
    if (byEmail) {
      return byEmail;
    }
  }

  if (criteria.phone) {
    return prisma.visitor.findFirst({
      where: {
        ...tenantVisitorWhere(ctx),
        phone: criteria.phone,
      },
    });
  }

  return null;
}

export async function getVisitorVisitSummary(
  ctx: TenantContext,
  visitorId: string,
): Promise<VisitorVisitSummary> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const [visitCount, lastVisit] = await Promise.all([
    prisma.visit.count({
      where: {
        organizationId: ctx.organizationId,
        visitorId,
      },
    }),
    prisma.visit.findFirst({
      where: {
        organizationId: ctx.organizationId,
        visitorId,
      },
      orderBy: [{ checkedInAt: "desc" }, { scheduledAt: "desc" }, { createdAt: "desc" }],
      select: {
        checkedInAt: true,
        scheduledAt: true,
      },
    }),
  ]);

  return {
    visitCount,
    lastVisitAt: lastVisit?.checkedInAt ?? lastVisit?.scheduledAt ?? null,
  };
}

export async function resolveVisitorIdentity(
  ctx: TenantContext,
  input: ResolveVisitorIdentityInput,
): Promise<{
  visitor: Visitor | null;
  visitSummary: VisitorVisitSummary | null;
}> {
  const visitor = await findExistingVisitorByIdentity(ctx, input);

  if (!visitor) {
    return { visitor: null, visitSummary: null };
  }

  const visitSummary = await getVisitorVisitSummary(ctx, visitor.id);
  return { visitor, visitSummary };
}

/**
 * Staff visitor creation — never silently reuses or updates an existing record.
 * Use `forceCreateVisitor` to intentionally create a duplicate profile.
 */
export async function createVisitorForStaff(
  ctx: TenantContext,
  input: CreateVisitorRequestInput,
): Promise<{ visitor: Visitor; created: true }> {
  requirePermission(ctx, PERMISSIONS.VISITOR_CREATE);

  const { forceCreateVisitor, ...visitorInput } = input;

  if (!forceCreateVisitor) {
    const existing = await findExistingVisitorByIdentity(ctx, {
      email: visitorInput.email,
      phone: visitorInput.phone,
    });

    if (existing) {
      throw new VisitorIdentityConflictError(existing);
    }
  }

  const visitor = await createVisitor(ctx, visitorInput);
  return { visitor, created: true };
}

export async function findVisitor(
  ctx: TenantContext,
  input: FindVisitorInput,
): Promise<Visitor | null> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const criteria = findVisitorSchema.parse(input);

  if (criteria.id) {
    return prisma.visitor.findFirst({
      where: {
        ...tenantVisitorWhere(ctx),
        id: criteria.id,
      },
    });
  }

  if (criteria.email) {
    const byEmail = await prisma.visitor.findFirst({
      where: {
        ...tenantVisitorWhere(ctx),
        email: criteria.email,
      },
    });
    if (byEmail) {
      return byEmail;
    }
  }

  if (criteria.phone) {
    return prisma.visitor.findFirst({
      where: {
        ...tenantVisitorWhere(ctx),
        phone: criteria.phone,
      },
    });
  }

  return null;
}

/**
 * @deprecated LEGACY ONLY — do not use in runtime UI flows.
 * Silent merge/update behavior. Use `resolveVisitor` + explicit `createVisitor`
 * from `@/lib/visits/visit-engine` instead.
 */
export async function getOrCreateVisitor(
  ctx: TenantContext,
  input: GetOrCreateVisitorInput,
): Promise<{ visitor: Visitor; created: boolean }> {
  requirePermission(ctx, PERMISSIONS.VISITOR_CREATE);

  const data = getOrCreateVisitorSchema.parse({
    ...input,
    phone: input.phone ? normalizePhone(input.phone) : undefined,
  });

  if (data.email) {
    const existingByEmail = await prisma.visitor.findFirst({
      where: {
        ...tenantVisitorWhere(ctx),
        email: data.email,
      },
    });

    if (existingByEmail) {
      const visitor = await maybeUpdateReturningVisitor(existingByEmail, data, ctx);
      return { visitor, created: false };
    }
  }

  if (data.phone) {
    const existingByPhone = await prisma.visitor.findFirst({
      where: {
        ...tenantVisitorWhere(ctx),
        phone: data.phone,
      },
    });

    if (existingByPhone) {
      const visitor = await maybeUpdateReturningVisitor(existingByPhone, data, ctx);
      return { visitor, created: false };
    }
  }

  const visitor = await prisma.visitor.create({
    data: {
      organizationId: ctx.organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      photoUrl: data.photoUrl ?? null,
      notes: data.notes ?? null,
    },
  });

  return { visitor, created: true };
}

export async function getVisitorById(
  ctx: TenantContext,
  visitorId: string,
): Promise<Visitor> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visitor = await prisma.visitor.findFirst({
    where: {
      ...tenantVisitorWhere(ctx),
      id: visitorId,
    },
  });

  if (!visitor) {
    throw new VisitorNotFoundError(visitorId);
  }

  return visitor;
}

export async function listVisitors(
  ctx: TenantContext,
  options?: {
    limit?: number;
    offset?: number;
    search?: string;
  },
): Promise<PaginatedResult<Visitor>> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const limit = Math.min(options?.limit ?? 25, 100);
  const offset = options?.offset ?? 0;

  const where = {
    ...tenantVisitorWhere(ctx),
    ...(options?.search
      ? {
          OR: [
            {
              firstName: {
                contains: options.search,
                mode: "insensitive" as const,
              },
            },
            {
              lastName: {
                contains: options.search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: options.search,
                mode: "insensitive" as const,
              },
            },
            {
              company: {
                contains: options.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.visitor.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: limit,
      skip: offset,
    }),
    prisma.visitor.count({ where }),
  ]);

  return buildPaginatedResult(items, total, limit, offset);
}

async function maybeUpdateReturningVisitor(
  existing: Visitor,
  data: GetOrCreateVisitorInput,
  ctx: TenantContext,
): Promise<Visitor> {
  const hasProfileChanges =
    existing.firstName !== data.firstName ||
    existing.lastName !== data.lastName ||
    (data.company !== undefined && existing.company !== (data.company ?? null)) ||
    (data.photoUrl !== undefined && existing.photoUrl !== (data.photoUrl ?? null)) ||
    (data.notes !== undefined && existing.notes !== (data.notes ?? null)) ||
    (data.email && !existing.email) ||
    (data.phone && !existing.phone);

  if (!hasProfileChanges) {
    return existing;
  }

  requirePermission(ctx, PERMISSIONS.VISITOR_UPDATE);

  return prisma.visitor.update({
    where: {
      id: existing.id,
      organizationId: ctx.organizationId,
    },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company ?? existing.company,
      photoUrl: data.photoUrl ?? existing.photoUrl,
      notes: data.notes ?? existing.notes,
      email: existing.email ?? data.email ?? null,
      phone: existing.phone ?? data.phone ?? null,
    },
  });
}
