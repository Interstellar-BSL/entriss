import type { PrismaClient } from "@/app/generated/prisma/client";

export const DEFAULT_PLAN_SLUG = "trial";

/**
 * Seeds the default trial plan used by new organizations.
 */
export async function seedDefaultPlan(db: PrismaClient): Promise<string> {
  const plan = await db.plan.upsert({
    where: { slug: DEFAULT_PLAN_SLUG },
    create: {
      name: "Trial",
      slug: DEFAULT_PLAN_SLUG,
      description: "14-day trial with standard limits",
      limits: {
        maxBranches: 3,
        maxMembers: 10,
        maxVisitsPerMonth: 500,
      },
      isActive: true,
    },
    update: {
      name: "Trial",
      description: "14-day trial with standard limits",
      isActive: true,
    },
  });

  return plan.id;
}
