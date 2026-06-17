import type { OrgStatus, SystemRole } from "@prisma/client";

import {
  isPlatformAdmin,
  isPlatformAdminPath,
  isPublicUnauthenticatedApiPath,
} from "@/lib/platform/access";

export const PUBLIC_API_PREFIXES = ["/api/auth"] as const;

export const ORG_CONTEXT_EXEMPT_API_PREFIXES = [
  "/api/v1/invites/",
] as const;

export const ONBOARDING_PATH_PREFIXES = ["/onboarding", "/request-access"] as const;

export const PUBLIC_UI_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/request-access",
  "/invite",
  "/accept-invite",
  "/setup-password",
] as const;

export interface MiddlewareAuthClaims {
  userId: string;
  email: string;
  systemRole: SystemRole | null;
  organizationId: string | null;
  role: string | null;
  organizationStatus: OrgStatus | null;
}

export interface MiddlewareOrgResolution {
  requiresOrganizationContext: boolean;
  missingOrganizationContext: boolean;
  organizationNotApproved: boolean;
  tenantMismatch: boolean;
  pathOrganizationId: string | null;
  resolvedOrganizationId: string | null;
}

export function isPublicInviteApiPath(pathname: string, method = "GET"): boolean {
  if (pathname === "/api/v1/invites/accept" && method === "POST") {
    return true;
  }

  if (method === "GET") {
    const match = pathname.match(/^\/api\/v1\/invites\/([^/]+)$/);
    if (match?.[1] && !["accept", "resend", "revoke"].includes(match[1])) {
      return true;
    }
  }

  return false;
}

export function isPublicAuthApiPath(pathname: string, method = "GET"): boolean {
  if (pathname === "/api/v1/auth/setup-password" && method === "POST") {
    return true;
  }

  if (pathname === "/api/v1/auth/setup-password/preview" && method === "GET") {
    return true;
  }

  return false;
}

export function isPublicApiPath(pathname: string, method = "GET"): boolean {
  return (
    PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    isPublicUnauthenticatedApiPath(pathname) ||
    isPublicInviteApiPath(pathname, method) ||
    isPublicAuthApiPath(pathname, method)
  );
}

export function isOnboardingPath(pathname: string): boolean {
  return ONBOARDING_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isPublicUiPath(pathname: string): boolean {
  return PUBLIC_UI_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isOrgContextExemptApiPath(
  pathname: string,
  method = "GET",
): boolean {
  if (
    ORG_CONTEXT_EXEMPT_API_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix),
    )
  ) {
    return true;
  }

  if (pathname === "/api/v1/organizations" && method === "POST") {
    return true;
  }

  if (pathname.startsWith("/api/v1/admin")) {
    return true;
  }

  return false;
}

/** Org-scoped collection routes under `/api/v1/organizations/*` (not `{orgId}`). */
const ORGANIZATION_PATH_COLLECTIONS = new Set(["members", "roles", "invites"]);

/** Prisma `cuid()` organization ids — used to distinguish resource paths from tenant ids. */
const ORGANIZATION_ID_PATTERN = /^c[a-z0-9]{20,}$/i;

export function extractOrganizationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/api\/v1\/organizations\/([^/]+)/);
  if (!match?.[1]) {
    return null;
  }

  const segment = match[1];

  if (ORGANIZATION_PATH_COLLECTIONS.has(segment)) {
    return null;
  }

  if (!ORGANIZATION_ID_PATTERN.test(segment)) {
    return null;
  }

  return segment;
}

export function requiresOrganizationContext(
  pathname: string,
  method = "GET",
): boolean {
  if (isPlatformAdminPath(pathname)) {
    return false;
  }

  return (
    pathname.startsWith("/api/v1/") && !isOrgContextExemptApiPath(pathname, method)
  );
}

/**
 * Resolves organization context for middleware strictly from JWT session claims.
 */
export function resolveMiddlewareOrganizationContext(input: {
  pathname: string;
  method?: string;
  claims: MiddlewareAuthClaims;
}): MiddlewareOrgResolution {
  const method = input.method ?? "GET";
  const requiresOrganizationContextFlag = requiresOrganizationContext(
    input.pathname,
    method,
  );
  const pathOrganizationId = extractOrganizationIdFromPath(input.pathname);
  const resolvedOrganizationId = input.claims.organizationId;

  const missingOrganizationContext =
    requiresOrganizationContextFlag && !resolvedOrganizationId;

  const organizationNotApproved = Boolean(
    requiresOrganizationContextFlag &&
      resolvedOrganizationId &&
      input.claims.organizationStatus !== "APPROVED",
  );

  const tenantMismatch = Boolean(
    pathOrganizationId &&
      resolvedOrganizationId &&
      pathOrganizationId !== resolvedOrganizationId,
  );

  return {
    requiresOrganizationContext: requiresOrganizationContextFlag,
    missingOrganizationContext,
    organizationNotApproved,
    tenantMismatch,
    pathOrganizationId,
    resolvedOrganizationId,
  };
}

export function claimsFromJwtToken(token: {
  userId?: string;
  email?: string;
  systemRole?: SystemRole | null;
  organizationId?: string | null;
  role?: string | null;
  organizationStatus?: OrgStatus | null;
}): MiddlewareAuthClaims | null {
  if (!token.userId || !token.email) {
    return null;
  }

  return {
    userId: token.userId,
    email: token.email,
    systemRole: token.systemRole ?? null,
    organizationId: token.organizationId ?? null,
    role: token.role ?? null,
    organizationStatus: token.organizationStatus ?? null,
  };
}
