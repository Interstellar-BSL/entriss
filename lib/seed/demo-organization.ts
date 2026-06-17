import type { PrismaClient } from "@prisma/client";
import { createOrganizationDefaults, SYSTEM_ROLE_SLUGS } from "./roles";

export const DEMO_ORGANIZATION_SLUG = "demo";

export interface SeedDemoOrganizationResult {
  organizationId: string;
  slug: string;
  ownerMemberId: string | null;
}

/**
 * Creates a demo tenant so the platform is usable immediately after seeding.
 * Idempotent — reuses the existing demo organization if present.
 */
export async function seedDemoOrganization(
  db: PrismaClient,
  ownerUserId: string,
): Promise<SeedDemoOrganizationResult> {
  const organization = await db.organization.upsert({
    where: { slug: DEMO_ORGANIZATION_SLUG },
    create: {
      name: "Entriss Demo",
      slug: DEMO_ORGANIZATION_SLUG,
      settings: {
        seeded: true,
        description: "Default demo organization for local development",
      },
      status: "APPROVED",
      isActive: true,
    },
    update: {
      name: "Entriss Demo",
      status: "APPROVED",
      isActive: true,
      deletedAt: null,
    },
  });

  const roleIds = await createOrganizationDefaults(db, organization.id);
  const ownerRoleId = roleIds.get(SYSTEM_ROLE_SLUGS.OWNER);

  if (!ownerRoleId) {
    throw new Error("Owner role was not created for the demo organization");
  }

  const membership = await db.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: ownerUserId,
      },
    },
    create: {
      organizationId: organization.id,
      userId: ownerUserId,
      roleId: ownerRoleId,
      status: "ACTIVE",
      isActive: true,
    },
    update: {
      roleId: ownerRoleId,
      status: "ACTIVE",
      isActive: true,
      deactivatedAt: null,
    },
  });

  return {
    organizationId: organization.id,
    slug: organization.slug,
    ownerMemberId: membership.id,
  };
}
