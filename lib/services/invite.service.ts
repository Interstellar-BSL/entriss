import { InviteStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit/logger";
import { sendMemberInviteEmail } from "@/lib/organization/invite-email";
import {
  enforceInviteCreate,
  enforceInviteList,
  enforceInviteResend,
  enforceInviteRevoke,
} from "@/lib/rbac/enforce";
import type { SystemRoleSlug } from "@/lib/rbac/roles";
import {
  generateInviteToken,
  hashInviteToken,
  isInviteExpired,
  verifyInviteToken,
} from "@/lib/security/invite-token";
import { loadOrganizationContext } from "@/lib/tenant/resolve-organization";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type {
  AcceptInviteInput,
  CreateInviteInput,
} from "@/lib/validations/invite";

import { ServiceError } from "./errors";
import { INVITE_TTL_DAYS } from "./organization.service";

function inviteExpiresAt() {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function findInviteByRawToken(token: string) {
  const tokenHash = hashInviteToken(token);

  const byHash = await prisma.organizationInvite.findFirst({
    where: { tokenHash },
    include: {
      organization: { select: { id: true, name: true, slug: true, status: true } },
      role: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (byHash && verifyInviteToken(token, byHash.tokenHash)) {
    return byHash;
  }

  const legacy = await prisma.organizationInvite.findFirst({
    where: { tokenHash: token },
    include: {
      organization: { select: { id: true, name: true, slug: true, status: true } },
      role: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (legacy && verifyInviteToken(token, legacy.tokenHash)) {
    return legacy;
  }

  return null;
}

async function validatePendingInvite(invite: {
  id: string;
  status: InviteStatus;
  expiresAt: Date;
}) {
  if (invite.status !== InviteStatus.PENDING) {
    throw new ServiceError(
      "INVITE_NOT_PENDING",
      `This invitation is ${invite.status.toLowerCase()}`,
    );
  }

  if (isInviteExpired(invite)) {
    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.EXPIRED },
    });
    throw new ServiceError("INVITE_EXPIRED", "This invitation has expired");
  }
}

async function sendInviteEmailForRecord(input: {
  to: string;
  organizationName: string;
  roleName: string;
  rawToken: string;
  invitedByName: string;
  expiresAt: Date;
}) {
  void sendMemberInviteEmail({
    to: input.to,
    organizationName: input.organizationName,
    roleName: input.roleName,
    inviteToken: input.rawToken,
    invitedByName: input.invitedByName,
    expiresAt: input.expiresAt,
  }).catch((error) => {
    console.error("[invite] failed to send invite email", error);
  });
}

function mapInviteRow(invite: {
  id: string;
  email: string;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
  role: { name: string; slug: string };
  invitedBy: { name: string | null; email: string };
}) {
  return {
    id: invite.id,
    email: invite.email,
    role: { name: invite.role.name, slug: invite.role.slug },
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
    invitedBy: {
      name: invite.invitedBy.name ?? invite.invitedBy.email,
      email: invite.invitedBy.email,
    },
  };
}

export async function listOrganizationInvites(
  ctx: TenantContext,
  status?: InviteStatus,
) {
  enforceInviteList(ctx);

  const invites = await prisma.organizationInvite.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(status ? { status } : {}),
    },
    include: {
      role: { select: { name: true, slug: true } },
      invitedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return invites.map(mapInviteRow);
}

export async function createOrganizationInvite(
  ctx: TenantContext,
  input: CreateInviteInput,
) {
  enforceInviteCreate(ctx);

  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: ctx.organizationId,
      user: { email: input.email },
      isActive: true,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (existingMember) {
    throw new ServiceError(
      "MEMBER_ALREADY_EXISTS",
      "This user is already a member of the organization",
    );
  }

  const existingPending = await prisma.organizationInvite.findFirst({
    where: {
      organizationId: ctx.organizationId,
      email: input.email,
      status: InviteStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (existingPending) {
    return resendOrganizationInvite(ctx, existingPending.id);
  }

  const role = await prisma.role.findFirst({
    where: {
      organizationId: ctx.organizationId,
      slug: input.roleSlug,
    },
    select: { id: true, name: true, slug: true },
  });

  if (!role) {
    throw new ServiceError("ROLE_NOT_FOUND", "The selected role is not available");
  }

  const organization = await prisma.organization.findFirst({
    where: { id: ctx.organizationId },
    select: { name: true },
  });

  if (!organization) {
    throw new ServiceError("ORGANIZATION_NOT_FOUND", "Organization not found");
  }

  const inviter = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true },
  });

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = inviteExpiresAt();

  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: ctx.organizationId,
      email: input.email,
      roleId: role.id,
      tokenHash,
      invitedById: ctx.userId,
      expiresAt,
    },
    select: { id: true, email: true },
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "INVITE_CREATED",
    resourceType: "OrganizationInvite",
    resourceId: invite.id,
    metadata: { email: input.email, roleSlug: role.slug },
  });

  await sendInviteEmailForRecord({
    to: input.email,
    organizationName: organization.name,
    roleName: role.name,
    rawToken,
    invitedByName: inviter?.name ?? inviter?.email ?? "A team member",
    expiresAt,
  });

  return {
    id: invite.id,
    email: invite.email,
    role: { name: role.name, slug: role.slug as SystemRoleSlug },
    expiresAt: expiresAt.toISOString(),
  };
}

export async function resendOrganizationInvite(
  ctx: TenantContext,
  inviteId: string,
) {
  enforceInviteResend(ctx);

  const invite = await prisma.organizationInvite.findFirst({
    where: {
      id: inviteId,
      organizationId: ctx.organizationId,
      status: InviteStatus.PENDING,
    },
    include: {
      organization: { select: { name: true } },
      role: { select: { name: true, slug: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invite) {
    throw new ServiceError("INVITE_NOT_FOUND", "Invite not found or not pending");
  }

  if (isInviteExpired(invite)) {
    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.EXPIRED },
    });
    throw new ServiceError("INVITE_EXPIRED", "This invitation has expired");
  }

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = inviteExpiresAt();

  await prisma.organizationInvite.update({
    where: { id: invite.id },
    data: {
      tokenHash,
      expiresAt,
      updatedAt: new Date(),
    },
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "INVITE_RESENT",
    resourceType: "OrganizationInvite",
    resourceId: invite.id,
    metadata: { email: invite.email },
  });

  await sendInviteEmailForRecord({
    to: invite.email,
    organizationName: invite.organization.name,
    roleName: invite.role.name,
    rawToken,
    invitedByName: invite.invitedBy.name ?? invite.invitedBy.email,
    expiresAt,
  });

  return {
    id: invite.id,
    email: invite.email,
    expiresAt: expiresAt.toISOString(),
    resent: true,
  };
}

export async function revokeOrganizationInvite(
  ctx: TenantContext,
  inviteId: string,
) {
  enforceInviteRevoke(ctx);

  const invite = await prisma.organizationInvite.findFirst({
    where: {
      id: inviteId,
      organizationId: ctx.organizationId,
      status: InviteStatus.PENDING,
    },
    select: { id: true, email: true },
  });

  if (!invite) {
    throw new ServiceError("INVITE_NOT_FOUND", "Invite not found or already handled");
  }

  await prisma.organizationInvite.update({
    where: { id: invite.id },
    data: {
      status: InviteStatus.REVOKED,
      revokedAt: new Date(),
    },
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "INVITE_REVOKED",
    resourceType: "OrganizationInvite",
    resourceId: invite.id,
    metadata: { email: invite.email },
  });

  return { id: invite.id, revoked: true };
}

export async function getInviteByToken(token: string) {
  const invite = await findInviteByRawToken(token);

  if (!invite) {
    throw new ServiceError("INVITE_NOT_FOUND", "Invitation not found");
  }

  await validatePendingInvite(invite);

  return {
    email: invite.email,
    organization: invite.organization,
    role: invite.role,
    invitedBy: {
      name: invite.invitedBy.name ?? invite.invitedBy.email,
      email: invite.invitedBy.email,
    },
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export async function acceptOrganizationInvite(
  userId: string,
  userEmail: string,
  token: string,
) {
  return acceptInviteWithCredentials({
    token,
    sessionUserId: userId,
    sessionEmail: userEmail,
  });
}

export async function acceptInviteWithCredentials(input: {
  token: string;
  sessionUserId?: string;
  sessionEmail?: string;
  name?: string;
  password?: string;
}) {
  const invite = await findInviteByRawToken(input.token);

  if (!invite) {
    throw new ServiceError("INVITE_NOT_FOUND", "Invitation not found");
  }

  await validatePendingInvite(invite);

  const normalizedInviteEmail = invite.email.toLowerCase().trim();

  if (input.sessionEmail) {
    const normalizedSessionEmail = input.sessionEmail.toLowerCase().trim();
    if (normalizedSessionEmail !== normalizedInviteEmail) {
      throw new ServiceError(
        "INVITE_EMAIL_MISMATCH",
        "Sign in with the email address that received this invitation",
      );
    }
  }

  const existingMembership = await prisma.organizationMember.findFirst({
    where: {
      organizationId: invite.organizationId,
      user: { email: normalizedInviteEmail },
      isActive: true,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (existingMembership) {
    throw new ServiceError(
      "MEMBER_ALREADY_EXISTS",
      "You are already a member of this organization",
    );
  }

  const otherOrgMembership = await prisma.organizationMember.findFirst({
    where: {
      user: { email: normalizedInviteEmail },
      isActive: true,
      status: "ACTIVE",
      organizationId: { not: invite.organizationId },
    },
    select: { id: true },
  });

  if (otherOrgMembership) {
    throw new ServiceError(
      "ORG_ALREADY_ASSIGNED",
      "This email is already assigned to another organization",
    );
  }

  let userId = input.sessionUserId;

  if (!userId) {
    if (!input.password || !input.name) {
      throw new ServiceError(
        "INVITE_SIGNUP_REQUIRED",
        "Name and password are required to accept this invitation",
      );
    }

    const user = await prisma.user.upsert({
      where: { email: normalizedInviteEmail },
      create: {
        email: normalizedInviteEmail,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        isActive: true,
      },
      update: {
        name: input.name,
        passwordHash: await hashPassword(input.password),
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    userId = user.id;
  } else if (input.name) {
    await prisma.user.update({
      where: { id: userId },
      data: { name: input.name },
    });
  }

  const membership = await prisma.$transaction(async (tx) => {
    const member = await tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId,
        },
      },
      create: {
        organizationId: invite.organizationId,
        userId,
        roleId: invite.roleId,
        status: "ACTIVE",
        isActive: true,
      },
      update: {
        roleId: invite.roleId,
        status: "ACTIVE",
        isActive: true,
        deactivatedAt: null,
      },
      select: { id: true },
    });

    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    return member;
  });

  await writeAuditLog({
    organizationId: invite.organizationId,
    actorId: userId,
    action: "INVITE_ACCEPTED",
    resourceType: "OrganizationInvite",
    resourceId: invite.id,
    metadata: { memberId: membership.id, roleSlug: invite.role.slug },
  });

  const organizationContext = await loadOrganizationContext(userId, null);

  if (organizationContext.organizationId !== invite.organizationId) {
    throw new ServiceError(
      "ORG_CONTEXT_FAILED",
      "Invitation accepted but organization context could not be loaded",
    );
  }

  return {
    organizationId: organizationContext.organizationId,
    organization: invite.organization,
    role: invite.role,
    memberId: organizationContext.memberId,
    roleId: organizationContext.roleId,
    organizationStatus: organizationContext.organizationStatus,
    userId,
    email: normalizedInviteEmail,
  };
}

/** Used when provisioning org admin from platform approval flow. */
export async function createProvisionedInvite(input: {
  organizationId: string;
  email: string;
  roleId: string;
  invitedById: string;
}) {
  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = inviteExpiresAt();

  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: input.organizationId,
      email: input.email,
      roleId: input.roleId,
      tokenHash,
      invitedById: input.invitedById,
      expiresAt,
      status: InviteStatus.PENDING,
    },
    select: { id: true },
  });

  return { inviteId: invite.id, rawToken, expiresAt };
}
