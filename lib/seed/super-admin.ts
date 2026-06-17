import type { PrismaClient } from "@/app/generated/prisma/client";
import { SystemRole } from "@/app/generated/prisma/enums";
import { hash } from "bcryptjs";

export const SUPER_ADMIN_EMAIL = "superadmin@entriss.local";

const DEFAULT_SUPER_ADMIN_PASSWORD = "Entriss!ChangeMe1";

export interface SeedSuperAdminResult {
  userId: string;
  email: string;
  created: boolean;
}

/**
 * Seeds the platform super admin (SYSTEM_OWNER).
 * Password is only set on create unless SEED_RESET_SUPER_ADMIN_PASSWORD=true.
 */
export async function seedSuperAdmin(
  db: PrismaClient,
): Promise<SeedSuperAdminResult> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? SUPER_ADMIN_EMAIL;
  const password =
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? DEFAULT_SUPER_ADMIN_PASSWORD;
  const resetPassword = process.env.SEED_RESET_SUPER_ADMIN_PASSWORD === "true";

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const passwordHash =
    !existing || resetPassword ? await hash(password, 12) : undefined;

  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
      name: "Super Admin",
      emailVerified: new Date(),
      passwordHash: passwordHash ?? (await hash(password, 12)),
      systemRole: SystemRole.PLATFORM_ADMIN,
      isActive: true,
    },
    update: {
      name: "Super Admin",
      systemRole: SystemRole.PLATFORM_ADMIN,
      isActive: true,
      deletedAt: null,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  return {
    userId: user.id,
    email: user.email,
    created: !existing,
  };
}
