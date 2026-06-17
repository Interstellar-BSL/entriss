import { InviteStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit/logger";
import {
  hashInviteToken,
  isInviteExpired,
  verifyInviteToken,
} from "@/lib/security/invite-token";

import { ServiceError } from "./errors";

async function findInviteByRawToken(token: string) {
  const tokenHash = hashInviteToken(token);

  const byHash = await prisma.organizationInvite.findFirst({
    where: { tokenHash },
    include: {
      organization: { select: { id: true, name: true, slug: true, status: true } },
    },
  });

  if (byHash && verifyInviteToken(token, byHash.tokenHash)) {
    return byHash;
  }

  const legacy = await prisma.organizationInvite.findFirst({
    where: { tokenHash: token },
    include: {
      organization: { select: { id: true, name: true, slug: true, status: true } },
    },
  });

  if (legacy && verifyInviteToken(token, legacy.tokenHash)) {
    return legacy;
  }

  return null;
}

export async function setupPasswordWithToken(input: {
  token: string;
  password: string;
}) {
  const invite = await findInviteByRawToken(input.token);

  if (!invite) {
    throw new ServiceError("PASSWORD_SETUP_INVALID", "Invalid or expired setup link");
  }

  if (invite.status !== InviteStatus.PENDING) {
    throw new ServiceError(
      "PASSWORD_SETUP_INVALID",
      `This setup link is no longer valid (${invite.status.toLowerCase()})`,
    );
  }

  if (isInviteExpired(invite)) {
    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.EXPIRED },
    });
    throw new ServiceError("PASSWORD_SETUP_EXPIRED", "This setup link has expired");
  }

  const normalizedEmail = invite.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, passwordHash: true, isActive: true },
  });

  if (!user) {
    throw new ServiceError(
      "PASSWORD_SETUP_USER_NOT_FOUND",
      "No account is pending password setup for this link",
    );
  }

  if (user.passwordHash) {
    throw new ServiceError(
      "PASSWORD_ALREADY_SET",
      "A password is already configured for this account. Sign in instead.",
    );
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      organizationId: invite.organizationId,
      userId: user.id,
      isActive: true,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (!membership) {
    throw new ServiceError(
      "PASSWORD_SETUP_MEMBERSHIP_MISSING",
      "Organization membership was not found for this account",
    );
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
    });

    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  });

  try {
    await writeAuditLog({
      organizationId: invite.organizationId,
      actorId: user.id,
      action: "PASSWORD_SETUP_COMPLETED",
      resourceType: "User",
      resourceId: user.id,
      metadata: { inviteId: invite.id },
    });
  } catch (auditError) {
    console.error("[password-setup] audit log failed:", auditError);
  }

  return {
    userId: user.id,
    email: normalizedEmail,
    organizationId: invite.organizationId,
    organization: invite.organization,
    organizationStatus: invite.organization.status,
  };
}

export async function previewPasswordSetupToken(token: string) {
  const invite = await findInviteByRawToken(token);

  if (!invite) {
    throw new ServiceError("PASSWORD_SETUP_INVALID", "Invalid or expired setup link");
  }

  if (invite.status !== InviteStatus.PENDING) {
    throw new ServiceError(
      "PASSWORD_SETUP_INVALID",
      `This setup link is no longer valid (${invite.status.toLowerCase()})`,
    );
  }

  if (isInviteExpired(invite)) {
    throw new ServiceError("PASSWORD_SETUP_EXPIRED", "This setup link has expired");
  }

  return {
    email: invite.email,
    organization: invite.organization,
    expiresAt: invite.expiresAt.toISOString(),
  };
}
