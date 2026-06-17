import { randomBytes } from "node:crypto";

import type { Prisma as PrismaTypes } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { isPrismaKnownRequestError } from "@/lib/db/prisma-errors";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { initializeBranchSettingsRecord } from "@/lib/settings/initialize";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import {
  createBranchSchema,
  updateBranchSchema,
  type CreateBranchInput,
  type UpdateBranchInput,
} from "@/lib/validations/branch";
import { normalizeBranchTimezone } from "@/lib/settings/branch-timezones";

import { BranchNotFoundError, ServiceError } from "./errors";
import {
  normalizeBranchCode,
  slugifyBranchName,
} from "./branch-slug";

const branchSelect = {
  id: true,
  organizationId: true,
  name: true,
  slug: true,
  code: true,
  description: true,
  timezone: true,
  isActive: true,
  updatedAt: true,
} as const;

export type BranchRecord = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  code: string | null;
  description: string | null;
  timezone: string;
  isActive: boolean;
  updatedAt: Date;
};

export type BranchSummary = Omit<BranchRecord, "updatedAt"> & {
  updatedAt: string;
};

export function serializeBranchRecord(branch: BranchRecord): BranchSummary {
  return {
    ...branch,
    updatedAt: branch.updatedAt.toISOString(),
  };
}

async function resolveUniqueSlug(
  organizationId: string,
  baseSlug: string,
  excludeBranchId?: string,
): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prisma.branch.findFirst({
      where: {
        organizationId,
        slug,
        deletedAt: null,
        ...(excludeBranchId ? { id: { not: excludeBranchId } } : {}),
      },
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

async function assertCodeAvailable(
  organizationId: string,
  code: string | null,
  excludeBranchId?: string,
) {
  if (!code) {
    return;
  }

  const existing = await prisma.branch.findFirst({
    where: {
      organizationId,
      code,
      deletedAt: null,
      ...(excludeBranchId ? { id: { not: excludeBranchId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new ServiceError(
      "BRANCH_CODE_TAKEN",
      `Branch code "${code}" is already in use`,
    );
  }
}

function mapPrismaConflict(error: unknown): never {
  if (isPrismaKnownRequestError(error) && error.code === "P2002") {
    throw new ServiceError(
      "BRANCH_CONFLICT",
      "A branch with this code or slug already exists in your organization",
    );
  }

  throw error;
}

export async function listBranches(ctx: TenantContext): Promise<BranchSummary[]> {
  requirePermission(ctx, PERMISSIONS.BRANCH_MANAGE);

  const branches = await prisma.branch.findMany({
    where: {
      organizationId: ctx.organizationId,
      deletedAt: null,
    },
    orderBy: { name: "asc" },
    select: branchSelect,
  });

  return branches.map(serializeBranchRecord);
}

export async function getBranchById(
  ctx: TenantContext,
  branchId: string,
): Promise<BranchSummary> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      organizationId: ctx.organizationId,
      deletedAt: null,
    },
    select: branchSelect,
  });

  if (!branch) {
    throw new BranchNotFoundError(branchId);
  }

  return serializeBranchRecord(branch);
}

export async function createBranch(
  ctx: TenantContext,
  input: CreateBranchInput,
): Promise<BranchSummary> {
  requirePermission(ctx, PERMISSIONS.BRANCH_MANAGE);

  const data = createBranchSchema.parse(input);
  const baseSlug = data.slug ?? slugifyBranchName(data.name);
  const slug = await resolveUniqueSlug(ctx.organizationId, baseSlug);
  const code = data.code ? normalizeBranchCode(data.code) : null;

  await assertCodeAvailable(ctx.organizationId, code);

  try {
    const branch = await prisma.branch.create({
      data: {
        organizationId: ctx.organizationId,
        name: data.name.trim(),
        slug,
        code,
        description: data.description?.trim() ?? null,
        timezone: normalizeBranchTimezone(data.timezone),
        qrSecret: randomBytes(32).toString("base64url"),
        isActive: true,
      },
      select: branchSelect,
    });

    await initializeBranchSettingsRecord(
      prisma,
      ctx.organizationId,
      branch.id,
    );

    return serializeBranchRecord(branch);
  } catch (error) {
    mapPrismaConflict(error);
  }
}

export async function updateBranch(
  ctx: TenantContext,
  branchId: string,
  input: UpdateBranchInput,
): Promise<BranchSummary> {
  requirePermission(ctx, PERMISSIONS.BRANCH_MANAGE);

  const data = updateBranchSchema.parse(input);

  await getBranchById(ctx, branchId);

  const updateData: PrismaTypes.BranchUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }

  if (data.code !== undefined) {
    const code = data.code ? normalizeBranchCode(data.code) : null;
    await assertCodeAvailable(ctx.organizationId, code, branchId);
    updateData.code = code;
  }

  if (data.description !== undefined) {
    updateData.description = data.description?.trim() ?? null;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  if (data.timezone !== undefined) {
    updateData.timezone = normalizeBranchTimezone(data.timezone);
  }

  try {
    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: updateData,
      select: branchSelect,
    });
    return serializeBranchRecord(branch);
  } catch (error) {
    mapPrismaConflict(error);
  }
}
