import type { SystemRole } from "@/app/generated/prisma/enums";
import type { ActiveOrganization } from "./resolve-organization";

export interface TenantContext {
  userId: string;
  email: string;
  systemRole: SystemRole | null;
  organizationId: string;
  activeOrganization: ActiveOrganization;
  role: string | null;
  memberId: string | null;
  roleId: string | null;
  permissions: string[];
  isSystemOwner: boolean;
}

export class TenantAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantAccessError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(permission: string) {
    super(`Missing required permission: ${permission}`);
    this.name = "PermissionDeniedError";
  }
}

export function hasPermission(
  context: TenantContext,
  permission: string,
): boolean {
  if (context.isSystemOwner) {
    return true;
  }

  return (context.permissions ?? []).includes(permission);
}

export function requirePermission(
  context: TenantContext,
  permission: string,
): void {
  if (!hasPermission(context, permission)) {
    throw new PermissionDeniedError(permission);
  }
}

export function assertOrganizationAccess(
  context: TenantContext,
  organizationId: string,
): void {
  if (context.organizationId !== organizationId) {
    throw new TenantAccessError(
      "Cross-tenant access denied: organization context mismatch",
    );
  }
}

export function buildTenantContext(input: {
  userId: string;
  email: string;
  systemRole: import("@/app/generated/prisma/enums").SystemRole | null;
  organizationId: string;
  organization: ActiveOrganization;
  role: string | null;
  memberId: string | null;
  roleId: string | null;
  permissions: string[];
}): TenantContext {
  return {
    userId: input.userId,
    email: input.email,
    systemRole: input.systemRole,
    organizationId: input.organizationId,
    activeOrganization: input.organization,
    role: input.role,
    memberId: input.memberId,
    roleId: input.roleId,
    permissions: input.permissions ?? [],
    isSystemOwner: input.systemRole === "SYSTEM_OWNER",
  };
}
