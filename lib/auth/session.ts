import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

import type { OrgStatus } from "@/app/generated/prisma/enums";
import { validateTenantSession } from "@/lib/auth/validate-tenant-session";
import {
  getInjectedTenantContext,
  getSystemRoleForUser,
} from "@/lib/tenant/injected-context";
import { loadOrganizationContext } from "@/lib/tenant/resolve-organization";
import {
  buildTenantContext,
  type TenantContext,
  TenantAccessError,
} from "@/lib/tenant/tenant-context";
import type { ActiveOrganization } from "@/lib/tenant/resolve-organization";
import { toRequestContext, type RequestContext } from "@/lib/tenant/request-context";
import { authOptions } from "./auth-options";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  organizationId: string | null;
  role: string | null;
  organizationStatus: OrgStatus | null;
  organizationName?: string | null;
  memberId?: string | null;
  permissions?: string[];
}

export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class OrganizationContextError extends Error {
  constructor(message = "Organization context is required") {
    super(message);
    this.name = "OrganizationContextError";
  }
}

export class TenantSessionInvalidError extends Error {
  constructor(message = "Tenant session is no longer valid") {
    super(message);
    this.name = "TenantSessionInvalidError";
  }
}

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    organizationId: session.user.organizationId ?? null,
    role: session.user.role ?? null,
    organizationStatus: session.user.organizationStatus ?? null,
    organizationName: session.user.organizationName ?? null,
    memberId: session.user.memberId ?? null,
    permissions: session.user.permissions ?? [],
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
}

async function tenantContextFromSessionUser(
  user: SessionUser,
): Promise<TenantContext | null> {
  if (!user.organizationId || user.organizationStatus !== "APPROVED") {
    return null;
  }

  const systemRole = await getSystemRoleForUser(user.id);
  const organizationContext = await loadOrganizationContext(user.id, systemRole);

  if (
    !organizationContext.organizationId ||
    !organizationContext.organization ||
    organizationContext.organizationStatus !== "APPROVED"
  ) {
    return null;
  }

  return buildTenantContext({
    userId: user.id,
    email: user.email,
    systemRole,
    organizationId: organizationContext.organizationId,
    organization: organizationContext.organization,
    role: organizationContext.role,
    memberId: organizationContext.memberId,
    roleId: organizationContext.roleId,
    permissions: organizationContext.permissions,
  });
}

export async function getTenantContext(
  request?: NextRequest | Request,
): Promise<TenantContext | null> {
  if (request) {
    const injected = await getInjectedTenantContext(request);
    if (injected) {
      return injected;
    }
  }

  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  return tenantContextFromSessionUser(user);
}

export async function getRequestContext(
  request?: NextRequest | Request,
): Promise<RequestContext | null> {
  const ctx = await getTenantContext(request);
  return ctx ? toRequestContext(ctx) : null;
}

export async function requireTenantContext(
  request?: NextRequest | Request,
): Promise<TenantContext> {
  const context = await getTenantContext(request);
  if (!context) {
    throw new OrganizationContextError();
  }

  const valid = await validateTenantSession({
    userId: context.userId,
    organizationId: context.organizationId,
  });

  if (!valid) {
    throw new TenantSessionInvalidError();
  }

  return context;
}

export async function requireRequestContext(
  request: NextRequest | Request,
): Promise<RequestContext> {
  const context = await requireTenantContext(request);
  return toRequestContext(context);
}

export async function requireTenantContextForOrganization(
  organizationId: string,
  request?: NextRequest | Request,
): Promise<TenantContext> {
  const context = await requireTenantContext(request);

  if (context.organizationId !== organizationId) {
    throw new TenantAccessError(
      "Cross-tenant access denied: organization context mismatch",
    );
  }

  return context;
}

export async function getJwtFromRequest(
  request: NextRequest,
): Promise<ReturnType<typeof getToken>> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET environment variable is not set");
  }

  return getToken({ req: request, secret });
}

export type { ActiveOrganization };
