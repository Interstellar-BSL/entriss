import type { ActiveOrganization } from "./resolve-organization";
import type { TenantContext } from "./tenant-context";

/**
 * Phase 7.1 request contract — alias of tenant context with explicit naming
 * for organization + membership role surfaced to handlers.
 */
export interface RequestContext extends TenantContext {
  organization: ActiveOrganization;
  memberRole: {
    id: string | null;
    permissions: string[];
  };
}

export function toRequestContext(ctx: TenantContext): RequestContext {
  return {
    ...ctx,
    organization: ctx.activeOrganization,
    memberRole: {
      id: ctx.roleId,
      permissions: ctx.permissions,
    },
  };
}
