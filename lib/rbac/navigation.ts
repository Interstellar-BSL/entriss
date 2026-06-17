import { PERMISSIONS, type Permission } from "./permissions";

export interface NavItemDefinition {
  href: string;
  label: string;
  /** User needs at least one of these permissions (empty = always visible). */
  permissions: Permission[];
}

export const APP_NAV_ITEMS: NavItemDefinition[] = [
  { href: "/", label: "Dashboard", permissions: [PERMISSIONS.VISITOR_READ] },
  { href: "/visitors", label: "Visitors", permissions: [PERMISSIONS.VISITOR_READ] },
  { href: "/visits", label: "Visits", permissions: [PERMISSIONS.VISITOR_READ] },
  { href: "/hosts", label: "Hosts", permissions: [PERMISSIONS.USER_MANAGE] },
  {
    href: "/reception",
    label: "Reception",
    permissions: [PERMISSIONS.VISIT_CHECK_IN, PERMISSIONS.VISITOR_READ],
  },
  { href: "/analytics", label: "Analytics", permissions: [PERMISSIONS.VISITOR_READ] },
  { href: "/dashboard/settings", label: "Settings", permissions: [PERMISSIONS.VISITOR_READ] },
];

export function hasAnyPermission(
  userPermissions: string[],
  required: Permission[],
): boolean {
  if (required.length === 0) {
    return true;
  }
  const set = new Set(userPermissions);
  return required.some((permission) => set.has(permission));
}

export function filterNavItemsForPermissions(userPermissions: string[]) {
  return APP_NAV_ITEMS.filter((item) =>
    hasAnyPermission(userPermissions, item.permissions),
  );
}

/** Route prefix → required permissions (any match grants access). */
export const ROUTE_PERMISSION_RULES: Array<{
  prefix: string;
  permissions: Permission[];
}> = [
  { prefix: "/reception", permissions: [PERMISSIONS.VISIT_CHECK_IN, PERMISSIONS.VISITOR_READ] },
  { prefix: "/analytics", permissions: [PERMISSIONS.VISITOR_READ] },
  {
    prefix: "/approvals",
    permissions: [
      PERMISSIONS.VISIT_APPROVE,
      PERMISSIONS.VISIT_APPROVE_PRE_VISIT,
      PERMISSIONS.VISIT_REJECT,
    ],
  },
  { prefix: "/visits/new", permissions: [PERMISSIONS.VISITOR_CREATE] },
  { prefix: "/visits", permissions: [PERMISSIONS.VISITOR_READ] },
  { prefix: "/hosts", permissions: [PERMISSIONS.USER_MANAGE] },
  { prefix: "/visitors", permissions: [PERMISSIONS.VISITOR_READ] },
  { prefix: "/settings/branches", permissions: [PERMISSIONS.BRANCH_MANAGE] },
  { prefix: "/settings/users", permissions: [PERMISSIONS.USER_MANAGE] },
  { prefix: "/settings/invites", permissions: [PERMISSIONS.INVITE_LIST] },
  { prefix: "/settings", permissions: [PERMISSIONS.VISITOR_READ] },
  { prefix: "/dashboard/settings", permissions: [PERMISSIONS.VISITOR_READ] },
  { prefix: "/notifications", permissions: [PERMISSIONS.VISITOR_READ] },
  { prefix: "/", permissions: [PERMISSIONS.VISITOR_READ] },
];

export function permissionsForPath(pathname: string): Permission[] | null {
  const normalized =
    pathname === "/dashboard" ? "/" : pathname;

  for (const rule of ROUTE_PERMISSION_RULES) {
    if (rule.prefix === "/") {
      if (normalized === "/" || normalized === "/dashboard") {
        return rule.permissions;
      }
      continue;
    }

    if (normalized === rule.prefix || normalized.startsWith(`${rule.prefix}/`)) {
      return rule.permissions;
    }
  }

  return null;
}

export function canAccessPath(pathname: string, userPermissions: string[]): boolean {
  const required = permissionsForPath(pathname);
  if (!required) {
    return true;
  }
  return hasAnyPermission(userPermissions, required);
}
