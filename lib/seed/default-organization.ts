import type { PrismaClient } from "@prisma/client";

import {
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_ORGANIZATION_SLUG,
} from "@/lib/tenant/constants";

import { createOrganizationDefaults } from "./roles";

export interface SeedDefaultOrganizationResult {
  organizationId: string;
  slug: string;
  created: boolean;
}

/**
 * Ensures the backward-compatible default tenant exists (id: default-org).
 * Idempotent — does not move existing data or replace the demo org.
 */
export async function seedDefaultOrganization(
  db: PrismaClient,
): Promise<SeedDefaultOrganizationResult> {
  const existing = await db.organization.findFirst({
    where: {
      OR: [{ id: DEFAULT_ORGANIZATION_ID }, { slug: DEFAULT_ORGANIZATION_SLUG }],
    },
    select: { id: true, slug: true },
  });

  if (existing) {
    await db.organization.update({
      where: { id: existing.id },
      data: {
        name: DEFAULT_ORGANIZATION_NAME,
        status: "APPROVED",
        isActive: true,
        deletedAt: null,
      },
    });

    await createOrganizationDefaults(db, existing.id);

    return {
      organizationId: existing.id,
      slug: existing.slug,
      created: false,
    };
  }

  const organization = await db.organization.create({
    data: {
      id: DEFAULT_ORGANIZATION_ID,
      name: DEFAULT_ORGANIZATION_NAME,
      slug: DEFAULT_ORGANIZATION_SLUG,
      settings: { seeded: true, bootstrap: "phase-7.1" },
      status: "APPROVED",
      isActive: true,
    },
    select: { id: true, slug: true },
  });

  await createOrganizationDefaults(db, organization.id);

  return {
    organizationId: organization.id,
    slug: organization.slug,
    created: true,
  };
}
