import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth-options";
import { isPlatformAdmin } from "@/lib/platform/access";

export class PlatformAdminError extends Error {
  constructor(message = "Platform administrator access required") {
    super(message);
    this.name = "PlatformAdminError";
  }
}

export async function requirePlatformAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new PlatformAdminError("Authentication required");
  }

  const systemRole = await getPlatformAdminRole(session.user.id);
  if (!isPlatformAdmin(systemRole)) {
    throw new PlatformAdminError();
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    systemRole,
  };
}

async function getPlatformAdminRole(userId: string) {
  const { prisma } = await import("@/lib/db/client");
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true, deletedAt: null },
    select: { systemRole: true },
  });
  return user?.systemRole ?? null;
}
