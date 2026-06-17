export {
  getOrganizationById,
  isOrganizationApproved,
  loadOrganizationContext,
  resolveUserOrganizationId,
  userCanAccessOrganization,
} from "./resolve-organization";
export type {
  ActiveOrganization,
  OrganizationContext,
} from "./resolve-organization";

export {
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_ORGANIZATION_SLUG,
} from "./constants";

export { orgIdFilter, withOrgScope, withOrgScopeData } from "./org-scope";

export {
  getInjectedRequestContext,
  getInjectedTenantContext,
  buildTenantContextFromInjectedClaims,
  getSystemRoleForUser,
} from "./injected-context";

export {
  REQUEST_CONTEXT_HEADERS,
  REQUEST_CONTEXT_VERSION,
  injectRequestContextHeaders,
  parseInjectedRequestContext,
  stripUntrustedContextHeaders,
} from "./request-headers";
export type { InjectedRequestContextClaims } from "./request-headers";

export {
  claimsFromJwtToken,
  extractOrganizationIdFromPath,
  isOnboardingPath,
  isOrgContextExemptApiPath,
  isPublicApiPath,
  requiresOrganizationContext,
  resolveMiddlewareOrganizationContext,
} from "./middleware-org-resolution";
export type {
  MiddlewareAuthClaims,
  MiddlewareOrgResolution,
} from "./middleware-org-resolution";

export { toRequestContext } from "./request-context";
export type { RequestContext } from "./request-context";

export {
  assertOrganizationAccess,
  buildTenantContext,
  hasPermission,
  requirePermission,
  PermissionDeniedError,
  TenantAccessError,
} from "./tenant-context";
export type { TenantContext } from "./tenant-context";
