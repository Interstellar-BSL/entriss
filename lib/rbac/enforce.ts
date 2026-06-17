import { PERMISSIONS, type Permission } from "./permissions";
import {
  hasPermission,
  requirePermission,
  type TenantContext,
} from "@/lib/tenant/tenant-context";

export function enforcePermission(ctx: TenantContext, permission: Permission) {
  requirePermission(ctx, permission);
}

export function enforceAnyPermission(
  ctx: TenantContext,
  permissions: Permission[],
) {
  if (ctx.isSystemOwner) {
    return;
  }

  const allowed = permissions.some((permission) =>
    hasPermission(ctx, permission),
  );

  if (!allowed) {
    requirePermission(ctx, permissions[0]!);
  }
}

export function canManageUsers(ctx: TenantContext) {
  return hasPermission(ctx, PERMISSIONS.USER_MANAGE);
}

export function canManageRoles(ctx: TenantContext) {
  return hasPermission(ctx, PERMISSIONS.ROLE_MANAGE);
}

export function enforceUserManagement(ctx: TenantContext) {
  enforcePermission(ctx, PERMISSIONS.USER_MANAGE);
}

export function enforceInviteList(ctx: TenantContext) {
  enforcePermission(ctx, PERMISSIONS.INVITE_LIST);
}

export function enforceInviteCreate(ctx: TenantContext) {
  enforcePermission(ctx, PERMISSIONS.INVITE_CREATE);
}

export function enforceInviteResend(ctx: TenantContext) {
  enforcePermission(ctx, PERMISSIONS.INVITE_RESEND);
}

export function enforceInviteRevoke(ctx: TenantContext) {
  enforcePermission(ctx, PERMISSIONS.INVITE_REVOKE);
}

export function enforceRoleManagement(ctx: TenantContext) {
  enforcePermission(ctx, PERMISSIONS.ROLE_MANAGE);
}
