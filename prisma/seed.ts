import "dotenv/config";

import { prisma } from "@/lib/db/client";
import {
  createOrganizationDefaults,
  seedDefaultOrganization,
  seedDefaultPlan,
  seedDemoOrganization,
  seedPermissions,
  seedRoles,
  seedSuperAdmin,
  SUPER_ADMIN_EMAIL,
} from "@/lib/seed";

export {
  createOrganizationDefaults,
  seedPermissions,
  seedRoles,
  seedSuperAdmin,
};

async function main(): Promise<void> {
  console.log("🌱 Seeding Entriss...\n");

  const permissionMap = await seedPermissions(prisma);
  console.log(`✓ Permissions (${permissionMap.size} global)`);

  const superAdmin = await seedSuperAdmin(prisma);
  console.log(
    `✓ Super admin (${superAdmin.email})${superAdmin.created ? " [created]" : " [updated]"}`,
  );

  const planId = await seedDefaultPlan(prisma);
  console.log(`✓ Default plan (trial, id: ${planId})`);

  const defaultOrg = await seedDefaultOrganization(prisma);
  console.log(
    `✓ Default organization (/${defaultOrg.slug}, id: ${defaultOrg.organizationId})${defaultOrg.created ? " [created]" : " [exists]"}`,
  );

  const seedDemo = process.env.SEED_DEMO_ORG !== "false";
  if (seedDemo) {
    const demo = await seedDemoOrganization(prisma, superAdmin.userId);
    console.log(
      `✓ Demo organization (/${demo.slug}, member: ${demo.ownerMemberId})`,
    );
  } else {
    console.log("○ Demo organization skipped (SEED_DEMO_ORG=false)");
  }

  console.log("\n✅ Seed complete.\n");
  console.log("Login credentials:");
  console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log(
    `  Password: ${process.env.SEED_SUPER_ADMIN_PASSWORD ?? "Entriss!ChangeMe1"}`,
  );
  console.log(`  Role:     SYSTEM_OWNER (platform override)\n`);
}

main()
  .catch((error: unknown) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
