import { MemberStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { BranchNotFoundError, HostNotFoundError } from "../errors";

export async function assertBranchInTenant(
  ctx: TenantContext,
  branchId: string,
): Promise<{ id: string; requiresApproval: boolean }> {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      organizationId: ctx.organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      requiresApproval: true,
    },
  });

  if (!branch) {
    throw new BranchNotFoundError(branchId);
  }

  return branch;
}

export async function assertHostInTenant(
  ctx: TenantContext,
  hostMemberId: string,
): Promise<{ id: string; userId: string }> {
  const host = await prisma.organizationMember.findFirst({
    where: {
      id: hostMemberId,
      organizationId: ctx.organizationId,
      isActive: true,
      deactivatedAt: null,
      status: MemberStatus.ACTIVE,
      user: { isActive: true },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!host) {
    throw new HostNotFoundError(hostMemberId);
  }

  return host;
}
