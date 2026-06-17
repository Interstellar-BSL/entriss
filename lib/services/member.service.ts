import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit/logger";
import { enforceUserManagement } from "@/lib/rbac/enforce";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type {
  CreateOrganizationMemberInput,
  UpdateOrganizationMemberInput,
} from "@/lib/validations/member";
import { ensureHostRoleIdForContext } from "@/lib/hosts/ensure-host-role";

import { ServiceError } from "./errors";

function generateTemporaryPassword() {
  return randomBytes(9).toString("base64url");
}

export async function listOrganizationRoles(ctx: TenantContext) {
  enforceUserManagement(ctx);

  return prisma.role.findMany({
    where: { organizationId: ctx.organizationId },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

export async function listOrganizationMembers(ctx: TenantContext) {
  enforceUserManagement(ctx);

  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: ctx.organizationId,
    },
    include: {
      user: { select: { id: true, email: true, name: true, isActive: true } },
      role: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ joinedAt: "asc" }],
  });

  return members.map((member) => ({
    id: member.id,
    userId: member.user.id,
    email: member.user.email,
    name: member.user.name,
    role: {
      id: member.role.id,
      name: member.role.name,
      slug: member.role.slug,
    },
    status: member.status,
    isActive: member.isActive && member.user.isActive,
    joinedAt: member.joinedAt.toISOString(),
  }));
}

export async function createOrganizationMember(
  ctx: TenantContext,
  input: CreateOrganizationMemberInput,
) {
  enforceUserManagement(ctx);

  const role = await prisma.role.findFirst({
    where: {
      id: input.roleId,
      organizationId: ctx.organizationId,
    },
    select: { id: true, name: true },
  });

  if (!role) {
    throw new ServiceError("ROLE_NOT_FOUND", "Role not found in this organization");
  }

  const existingMembership = await prisma.organizationMember.findFirst({
    where: {
      user: { email: input.email },
      organizationId: { not: ctx.organizationId },
      isActive: true,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (existingMembership) {
    throw new ServiceError(
      "USER_ORG_CONFLICT",
      "This user already belongs to another organization",
    );
  }

  const temporaryPassword = generateTemporaryPassword();

  const member = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: input.email },
      create: {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(temporaryPassword),
        isActive: true,
      },
      update: {
        name: input.name,
        isActive: true,
        deletedAt: null,
        passwordHash: await hashPassword(temporaryPassword),
      },
      select: { id: true, email: true, name: true },
    });

    const membership = await tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: ctx.organizationId,
          userId: user.id,
        },
      },
      create: {
        organizationId: ctx.organizationId,
        userId: user.id,
        roleId: role.id,
        status: "ACTIVE",
        isActive: true,
      },
      update: {
        roleId: role.id,
        status: "ACTIVE",
        isActive: true,
        deactivatedAt: null,
      },
      include: {
        role: { select: { id: true, name: true, slug: true } },
      },
    });

    return { user, membership };
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "MEMBER_CREATED",
    resourceType: "OrganizationMember",
    resourceId: member.membership.id,
    metadata: { email: member.user.email, roleId: role.id },
  });

  return {
    id: member.membership.id,
    userId: member.user.id,
    email: member.user.email,
    name: member.user.name,
    role: member.membership.role,
    temporaryPassword,
  };
}

export async function createOrganizationHost(
  ctx: TenantContext,
  input: { email: string; name: string },
) {
  const hostRoleId = await ensureHostRoleIdForContext(ctx);
  return createOrganizationMember(ctx, {
    email: input.email,
    name: input.name,
    roleId: hostRoleId,
  });
}

export async function updateOrganizationMember(
  ctx: TenantContext,
  memberId: string,
  input: UpdateOrganizationMemberInput,
) {
  enforceUserManagement(ctx);

  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId: ctx.organizationId,
    },
    include: { user: true },
  });

  if (!member) {
    throw new ServiceError("MEMBER_NOT_FOUND", "Member not found");
  }

  if (input.roleId) {
    const role = await prisma.role.findFirst({
      where: { id: input.roleId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!role) {
      throw new ServiceError("ROLE_NOT_FOUND", "Role not found in this organization");
    }
  }

  await prisma.$transaction(async (tx) => {
    if (input.name) {
      await tx.user.update({
        where: { id: member.userId },
        data: { name: input.name },
      });
    }

    await tx.organizationMember.update({
      where: { id: member.id },
      data: {
        ...(input.roleId ? { roleId: input.roleId } : {}),
      },
    });
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "MEMBER_UPDATED",
    resourceType: "OrganizationMember",
    resourceId: member.id,
    metadata: { ...input },
  });

  return { id: member.id, updated: true };
}

export async function disableOrganizationMember(
  ctx: TenantContext,
  memberId: string,
) {
  enforceUserManagement(ctx);

  if (memberId === ctx.memberId) {
    throw new ServiceError(
      "MEMBER_SELF_DISABLE",
      "You cannot disable your own account",
    );
  }

  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId: ctx.organizationId,
    },
    select: { id: true, userId: true },
  });

  if (!member) {
    throw new ServiceError("MEMBER_NOT_FOUND", "Member not found");
  }

  await prisma.organizationMember.update({
    where: { id: member.id },
    data: {
      isActive: false,
      status: "DISABLED",
      deactivatedAt: new Date(),
    },
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "MEMBER_DISABLED",
    resourceType: "OrganizationMember",
    resourceId: member.id,
  });

  return { id: member.id, disabled: true };
}
