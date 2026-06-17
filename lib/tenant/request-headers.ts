import type { SystemRole } from "@/app/generated/prisma/enums";

/** Header names injected by middleware — never trust values from the client. */
export const REQUEST_CONTEXT_HEADERS = {
  version: "x-request-context-version",
  userId: "x-user-id",
  userEmail: "x-user-email",
  organizationId: "x-organization-id",
  role: "x-role",
  systemRole: "x-system-role",
} as const;

export const REQUEST_CONTEXT_VERSION = "2";

const TRUSTED_HEADER_NAMES = new Set<string>(Object.values(REQUEST_CONTEXT_HEADERS));

export interface InjectedRequestContextClaims {
  userId: string;
  email: string;
  systemRole: SystemRole | null;
  organizationId: string;
  role: string | null;
}

export function stripUntrustedContextHeaders(headers: Headers) {
  for (const headerName of TRUSTED_HEADER_NAMES) {
    headers.delete(headerName);
  }
}

export function injectRequestContextHeaders(
  headers: Headers,
  claims: InjectedRequestContextClaims,
) {
  headers.set(REQUEST_CONTEXT_HEADERS.version, REQUEST_CONTEXT_VERSION);
  headers.set(REQUEST_CONTEXT_HEADERS.userId, claims.userId);
  headers.set(REQUEST_CONTEXT_HEADERS.userEmail, claims.email);
  headers.set(REQUEST_CONTEXT_HEADERS.organizationId, claims.organizationId);

  if (claims.role) {
    headers.set(REQUEST_CONTEXT_HEADERS.role, claims.role);
  } else {
    headers.delete(REQUEST_CONTEXT_HEADERS.role);
  }

  if (claims.systemRole) {
    headers.set(REQUEST_CONTEXT_HEADERS.systemRole, claims.systemRole);
  } else {
    headers.delete(REQUEST_CONTEXT_HEADERS.systemRole);
  }
}

export function parseInjectedRequestContext(
  headers: Headers,
): InjectedRequestContextClaims | null {
  if (headers.get(REQUEST_CONTEXT_HEADERS.version) !== REQUEST_CONTEXT_VERSION) {
    return null;
  }

  const userId = headers.get(REQUEST_CONTEXT_HEADERS.userId);
  const email = headers.get(REQUEST_CONTEXT_HEADERS.userEmail);
  const organizationId = headers.get(REQUEST_CONTEXT_HEADERS.organizationId);

  if (!userId || !email || !organizationId) {
    return null;
  }

  const role = headers.get(REQUEST_CONTEXT_HEADERS.role);
  const systemRoleRaw = headers.get(REQUEST_CONTEXT_HEADERS.systemRole);

  return {
    userId,
    email,
    systemRole:
      systemRoleRaw === "SYSTEM_OWNER" || systemRoleRaw === "PLATFORM_ADMIN"
        ? systemRoleRaw
        : null,
    organizationId,
    role: role || null,
  };
}
