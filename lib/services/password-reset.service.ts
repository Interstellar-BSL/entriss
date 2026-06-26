import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { sendPasswordResetEmail } from "@/lib/auth/password-reset-email";
import { writeAuditLog } from "@/lib/audit/logger";
import { writePlatformAuditLog } from "@/lib/platform/audit";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetExpired,
  passwordResetExpiresAt,
  verifyPasswordResetToken,
} from "@/lib/security/password-reset-token";
import { loadOrganizationContext } from "@/lib/tenant/resolve-organization";

import { ServiceError } from "./errors";

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email address, we sent password reset instructions.";

async function findResetTokenRecord(rawToken: string) {
  const tokenHash = hashPasswordResetToken(rawToken);

  const byHash = await prisma.verificationToken.findUnique({
    where: { token: tokenHash },
  });

  if (byHash && verifyPasswordResetToken(rawToken, byHash.token)) {
    return byHash;
  }

  const legacy = await prisma.verificationToken.findUnique({
    where: { token: rawToken },
  });

  if (legacy && verifyPasswordResetToken(rawToken, legacy.token)) {
    return legacy;
  }

  return null;
}

async function loadBrandingForEmail(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      isActive: true,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
    select: {
      organization: {
        select: {
          name: true,
          organizationSettings: {
            select: {
              logoUrl: true,
              primaryColor: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return {
      organizationName: "Entriss",
      logoUrl: null,
      primaryColor: null,
    };
  }

  return {
    organizationName: membership.organization.name,
    logoUrl: membership.organization.organizationSettings?.logoUrl ?? null,
    primaryColor:
      membership.organization.organizationSettings?.primaryColor ?? null,
  };
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      isActive: true,
      deletedAt: null,
      passwordHash: { not: null },
    },
    select: { id: true, email: true },
  });

  if (!user) {
    return { message: GENERIC_FORGOT_PASSWORD_MESSAGE };
  }

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = passwordResetExpiresAt();

  await prisma.verificationToken.deleteMany({
    where: { identifier: normalizedEmail },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: tokenHash,
      expires: expiresAt,
    },
  });

  const branding = await loadBrandingForEmail(user.id);

  void sendPasswordResetEmail({
    to: user.email,
    resetToken: rawToken,
    expiresAt,
    organizationName: branding.organizationName,
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor,
  }).catch((error) => {
    console.error("[forgot-password] email delivery failed:", error);
  });

  return { message: GENERIC_FORGOT_PASSWORD_MESSAGE };
}

export async function previewPasswordResetToken(token: string) {
  const record = await findResetTokenRecord(token);

  if (!record) {
    throw new ServiceError(
      "PASSWORD_RESET_INVALID",
      "This password reset link is invalid or has already been used",
    );
  }

  if (isPasswordResetExpired(record)) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    });
    throw new ServiceError(
      "PASSWORD_RESET_EXPIRED",
      "This password reset link has expired",
    );
  }

  const email = record.identifier;
  const maskedEmail = email.replace(
    /^(.)(.*)(@.*)$/,
    (_, first: string, middle: string, domain: string) =>
      `${first}${"*".repeat(Math.max(middle.length, 2))}${domain}`,
  );

  return {
    email: maskedEmail,
    expiresAt: record.expires.toISOString(),
  };
}

export async function resetPasswordWithToken(input: {
  token: string;
  newPassword: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const record = await findResetTokenRecord(input.token);

  if (!record) {
    throw new ServiceError(
      "PASSWORD_RESET_INVALID",
      "This password reset link is invalid or has already been used",
    );
  }

  if (isPasswordResetExpired(record)) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    });
    throw new ServiceError(
      "PASSWORD_RESET_EXPIRED",
      "This password reset link has expired",
    );
  }

  const normalizedEmail = record.identifier.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      systemRole: true,
    },
  });

  if (!user) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });
    throw new ServiceError(
      "PASSWORD_RESET_INVALID",
      "This password reset link is invalid or has already been used",
    );
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await tx.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });
  });

  const organizationContext = await loadOrganizationContext(
    user.id,
    user.systemRole,
  );

  try {
    if (organizationContext.organizationId) {
      await writeAuditLog({
        organizationId: organizationContext.organizationId,
        actorId: user.id,
        action: "PASSWORD_RESET_COMPLETED",
        resourceType: "User",
        resourceId: user.id,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    } else {
      await writePlatformAuditLog({
        actorId: user.id,
        action: "PASSWORD_RESET_COMPLETED",
        resourceType: "User",
        resourceId: user.id,
        metadata: { scope: "platform" },
      });
    }
  } catch (auditError) {
    console.error("[reset-password] audit log failed:", auditError);
  }

  return {
    email: user.email,
  };
}
