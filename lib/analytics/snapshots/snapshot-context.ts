import type { SystemRole } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import type { ActiveOrganization } from "@/lib/tenant/resolve-organization";
import type { TenantContext } from "@/lib/tenant/tenant-context";

export async function buildSnapshotTenantContext(
  organizationId: string,
): Promise<TenantContext> {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, isActive: true, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });

  const activeOrganization: ActiveOrganization = organization ?? {
    id: organizationId,
    name: "Organization",
    slug: organizationId,
  };

  return {
    userId: "system-snapshot",
    email: "snapshot@system.internal",
    systemRole: "SYSTEM_OWNER" as SystemRole,
    organizationId,
    activeOrganization,
    role: "System Owner",
    memberId: null,
    roleId: null,
    permissions: [],
    isSystemOwner: true,
  };
}
