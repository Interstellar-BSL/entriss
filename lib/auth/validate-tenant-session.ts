import { prisma } from "@/lib/db/client";
import { isOrganizationApproved } from "@/lib/tenant/resolve-organization";

/**
 * Re-validates tenant session against the database on each API request.
 * Ensures organization still exists, is approved, and membership is active.
 */
export async function validateTenantSession(input: {
  userId: string;
  organizationId: string;
}): Promise<boolean> {
  const [organization, membership] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: input.organizationId, deletedAt: null },
      select: { isActive: true, deletedAt: true, status: true },
    }),
    prisma.organizationMember.findFirst({
      where: {
        userId: input.userId,
        organizationId: input.organizationId,
        isActive: true,
        status: "ACTIVE",
      },
      select: { id: true },
    }),
  ]);

  if (!organization || !membership) {
    return false;
  }

  return isOrganizationApproved(organization);
}

export async function userHasTenantMembership(userId: string): Promise<boolean> {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      isActive: true,
      status: "ACTIVE",
      organization: {
        deletedAt: null,
        status: "APPROVED",
        isActive: true,
      },
    },
    select: { id: true },
  });

  return membership !== null;
}
