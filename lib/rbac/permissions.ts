/**
 * Global permission catalog for Entriss RBAC.
 * Seeded once into the `permissions` table via prisma/seed.ts.
 */

export const PERMISSIONS = {
  VISITOR_CREATE: "visitor:create",
  VISITOR_READ: "visitor:read",
  VISITOR_UPDATE: "visitor:update",
  VISITOR_DELETE: "visitor:delete",
  VISIT_CHECK_IN: "visit:check_in",
  VISIT_CHECK_OUT: "visit:check_out",
  VISIT_APPROVE: "visit:approve",
  VISIT_REJECT: "visit:reject",
  VISIT_APPROVE_PRE_VISIT: "visit:approve_pre_visit",
  VISIT_APPROVE_CHECKIN: "visit:approve_checkin",
  VISIT_REJECT_CHECKIN: "visit:reject_checkin",
  VISIT_OVERRIDE_APPROVAL: "visit:override_approval",
  VISIT_FORCE_CHECKIN: "visit:force_checkin",
  VISIT_FORCE_CHECKOUT: "visit:force_checkout",
  BRANCH_MANAGE: "branch:manage",
  USER_MANAGE: "user:manage",
  ROLE_MANAGE: "role:manage",
  INVITE_CREATE: "invite:create",
  INVITE_LIST: "invite:list",
  INVITE_RESEND: "invite:resend",
  INVITE_REVOKE: "invite:revoke",
  AUDIT_READ: "audit:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export interface PermissionDefinition {
  slug: Permission;
  description: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    slug: PERMISSIONS.VISITOR_CREATE,
    description: "Create new visitor records",
  },
  {
    slug: PERMISSIONS.VISITOR_READ,
    description: "View visitor records",
  },
  {
    slug: PERMISSIONS.VISITOR_UPDATE,
    description: "Update visitor records",
  },
  {
    slug: PERMISSIONS.VISITOR_DELETE,
    description: "Delete or deactivate visitor records",
  },
  {
    slug: PERMISSIONS.VISIT_CHECK_IN,
    description: "Check visitors in at a branch",
  },
  {
    slug: PERMISSIONS.VISIT_CHECK_OUT,
    description: "Check visitors out from a branch",
  },
  {
    slug: PERMISSIONS.VISIT_APPROVE,
    description: "Approve pending visits",
  },
  {
    slug: PERMISSIONS.VISIT_REJECT,
    description: "Reject pending visits",
  },
  {
    slug: PERMISSIONS.VISIT_APPROVE_PRE_VISIT,
    description: "Approve pending visits",
  },
  {
    slug: PERMISSIONS.VISIT_APPROVE_CHECKIN,
    description: "Approve pending visits (legacy permission slug)",
  },
  {
    slug: PERMISSIONS.VISIT_REJECT_CHECKIN,
    description: "Reject pending visits (legacy permission slug)",
  },
  {
    slug: PERMISSIONS.VISIT_OVERRIDE_APPROVAL,
    description: "Override approval requirement and force check-in",
  },
  {
    slug: PERMISSIONS.VISIT_FORCE_CHECKIN,
    description: "Force check-in bypassing operational blockers (supervisor override)",
  },
  {
    slug: PERMISSIONS.VISIT_FORCE_CHECKOUT,
    description: "Force check-out for exceptional situations (supervisor override)",
  },
  {
    slug: PERMISSIONS.BRANCH_MANAGE,
    description: "Create, update, and manage branches",
  },
  {
    slug: PERMISSIONS.USER_MANAGE,
    description: "Invite, update, and remove organization members",
  },
  {
    slug: PERMISSIONS.INVITE_CREATE,
    description: "Create organization member invitations",
  },
  {
    slug: PERMISSIONS.INVITE_LIST,
    description: "View organization invitations",
  },
  {
    slug: PERMISSIONS.INVITE_RESEND,
    description: "Resend pending organization invitations",
  },
  {
    slug: PERMISSIONS.INVITE_REVOKE,
    description: "Revoke pending organization invitations",
  },
  {
    slug: PERMISSIONS.ROLE_MANAGE,
    description: "Manage roles and permission assignments",
  },
  {
    slug: PERMISSIONS.AUDIT_READ,
    description: "View organization audit logs",
  },
];
