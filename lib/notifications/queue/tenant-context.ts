import type { TenantContext } from "@/lib/tenant/tenant-context";

import type { JobTenantContext } from "./job-types";

export function toJobTenantContext(ctx: TenantContext): JobTenantContext {
  return {
    organizationId: ctx.organizationId,
    organizationName: ctx.activeOrganization.name,
  };
}

export function fromJobTenantContext(context: JobTenantContext): TenantContext {
  return {
    organizationId: context.organizationId,
    userId: "notification-worker",
    email: "worker@entriss.local",
    systemRole: "SYSTEM_OWNER",
    activeOrganization: {
      id: context.organizationId,
      name: context.organizationName,
      slug: "default",
    },
    role: null,
    memberId: null,
    roleId: null,
    permissions: [],
    isSystemOwner: false,
  };
}
