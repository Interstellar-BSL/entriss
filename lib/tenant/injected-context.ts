import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db/client";
import {
  loadOrganizationContext,
  type OrganizationContext,
} from "./resolve-organization";
import {
  buildTenantContext,
  type TenantContext,
} from "./tenant-context";
import {
  parseInjectedRequestContext,
  type InjectedRequestContextClaims,
} from "./request-headers";
import { toRequestContext, type RequestContext } from "./request-context";

async function tenantContextFromOrganizationContext(
  claims: InjectedRequestContextClaims,
  organizationContext: OrganizationContext,
): Promise<TenantContext | null> {
  if (
    !organizationContext.organizationId ||
    !organizationContext.organization ||
    organizationContext.organizationStatus !== "APPROVED"
  ) {
    return null;
  }

  return buildTenantContext({
    userId: claims.userId,
    email: claims.email,
    systemRole: claims.systemRole,
    organizationId: organizationContext.organizationId,
    organization: organizationContext.organization,
    role: organizationContext.role,
    memberId: organizationContext.memberId,
    roleId: organizationContext.roleId,
    permissions: organizationContext.permissions,
  });
}

export async function buildTenantContextFromInjectedClaims(
  claims: InjectedRequestContextClaims,
): Promise<TenantContext | null> {
  const organizationContext = await loadOrganizationContext(
    claims.userId,
    claims.systemRole,
  );

  if (organizationContext.organizationId !== claims.organizationId) {
    return null;
  }

  return tenantContextFromOrganizationContext(claims, organizationContext);
}

export async function getInjectedTenantContext(
  source: NextRequest | Request | Headers,
): Promise<TenantContext | null> {
  const headers = source instanceof Headers ? source : source.headers;
  const claims = parseInjectedRequestContext(headers);
  if (!claims) {
    return null;
  }

  return buildTenantContextFromInjectedClaims(claims);
}

export async function getInjectedRequestContext(
  source: NextRequest | Request | Headers,
): Promise<RequestContext | null> {
  const ctx = await getInjectedTenantContext(source);
  return ctx ? toRequestContext(ctx) : null;
}

export async function getSystemRoleForUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true, deletedAt: null },
    select: { systemRole: true },
  });
  return user?.systemRole ?? null;
}
