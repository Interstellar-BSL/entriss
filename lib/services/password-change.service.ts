import { prisma } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit/logger";
import { writePlatformAuditLog } from "@/lib/platform/audit";
import { loadOrganizationContext } from "@/lib/tenant/resolve-organization";

import { ServiceError } from "./errors";

export async function changeUserPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  organizationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const user = await prisma.user.findFirst({
    where: {
      id: input.userId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      systemRole: true,
    },
  });

  if (!user) {
    throw new ServiceError("USER_NOT_FOUND", "Account not found");
  }

  if (!user.passwordHash) {
    throw new ServiceError(
      "PASSWORD_NOT_SET",
      "No password is configured for this account. Use the setup link from your invitation email.",
    );
  }

  const currentValid = await verifyPassword(
    input.currentPassword,
    user.passwordHash,
  );

  if (!currentValid) {
    throw new ServiceError(
      "CURRENT_PASSWORD_INVALID",
      "Current password is incorrect",
    );
  }

  const unchanged = await verifyPassword(input.newPassword, user.passwordHash);
  if (unchanged) {
    throw new ServiceError(
      "PASSWORD_UNCHANGED",
      "New password must be different from your current password",
    );
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  const auditOrganizationId =
    input.organizationId ??
    (await loadOrganizationContext(user.id, user.systemRole)).organizationId;

  try {
    if (auditOrganizationId) {
      await writeAuditLog({
        organizationId: auditOrganizationId,
        actorId: user.id,
        action: "PASSWORD_CHANGED",
        resourceType: "User",
        resourceId: user.id,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    } else {
      await writePlatformAuditLog({
        actorId: user.id,
        action: "PASSWORD_CHANGED",
        resourceType: "User",
        resourceId: user.id,
        metadata: { scope: "platform" },
      });
    }
  } catch (auditError) {
    console.error("[change-password] audit log failed:", auditError);
  }

  return { success: true as const };
}
