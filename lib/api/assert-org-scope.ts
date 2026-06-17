import type { TenantContext } from "@/lib/tenant/tenant-context";
import { TenantAccessError } from "@/lib/tenant/tenant-context";

export class OrgScopeViolationError extends TenantAccessError {
  constructor(message = "Organization scope violation") {
    super(message);
    this.name = "OrgScopeViolationError";
  }
}

export function assertOrgScope(
  ctx: TenantContext,
  resourceOrganizationId: string,
) {
  if (ctx.organizationId !== resourceOrganizationId) {
    throw new OrgScopeViolationError(
      "Cross-tenant access denied: resource belongs to another organization",
    );
  }
}

export function assertOrgScopeOptional(
  ctx: TenantContext,
  resourceOrganizationId: string | null | undefined,
) {
  if (!resourceOrganizationId) {
    return;
  }

  assertOrgScope(ctx, resourceOrganizationId);
}
