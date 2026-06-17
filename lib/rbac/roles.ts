/**
 * Default org-scoped roles seeded per organization via createOrganizationDefaults().
 */

import { PERMISSIONS, type Permission } from "./permissions";

export const SYSTEM_ROLE_SLUGS = {
  OWNER: "owner",
  ORG_ADMIN: "org-admin",
  ADMIN: "admin",
  RECEPTIONIST: "receptionist",
  SECURITY: "security",
  VIEWER: "viewer",
  HOST: "host",
} as const;

export type SystemRoleSlug =
  (typeof SYSTEM_ROLE_SLUGS)[keyof typeof SYSTEM_ROLE_SLUGS];

export interface RoleDefinition {
  name: string;
  slug: SystemRoleSlug;
  description: string;
  permissions: Permission[];
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: "Owner",
    slug: SYSTEM_ROLE_SLUGS.OWNER,
    description: "Full access to all organization permissions",
    permissions: Object.values(PERMISSIONS),
  },
  {
    name: "Organization Administrator",
    slug: SYSTEM_ROLE_SLUGS.ORG_ADMIN,
    description: "Primary organization administrator provisioned at tenant creation",
    permissions: [
      PERMISSIONS.VISITOR_CREATE,
      PERMISSIONS.VISITOR_READ,
      PERMISSIONS.VISITOR_UPDATE,
      PERMISSIONS.VISITOR_DELETE,
      PERMISSIONS.VISIT_CHECK_IN,
      PERMISSIONS.VISIT_CHECK_OUT,
      PERMISSIONS.VISIT_APPROVE,
      PERMISSIONS.VISIT_REJECT,
      PERMISSIONS.VISIT_APPROVE_PRE_VISIT,
      PERMISSIONS.VISIT_APPROVE_CHECKIN,
      PERMISSIONS.VISIT_REJECT_CHECKIN,
      PERMISSIONS.VISIT_FORCE_CHECKIN,
      PERMISSIONS.VISIT_FORCE_CHECKOUT,
      PERMISSIONS.BRANCH_MANAGE,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.INVITE_CREATE,
      PERMISSIONS.INVITE_LIST,
      PERMISSIONS.INVITE_RESEND,
      PERMISSIONS.INVITE_REVOKE,
      PERMISSIONS.AUDIT_READ,
    ],
  },
  {
    name: "Admin",
    slug: SYSTEM_ROLE_SLUGS.ADMIN,
    description:
      "Manage users, branches, visitors, and visits; excludes system-level role management",
    permissions: [
      PERMISSIONS.VISITOR_CREATE,
      PERMISSIONS.VISITOR_READ,
      PERMISSIONS.VISITOR_UPDATE,
      PERMISSIONS.VISITOR_DELETE,
      PERMISSIONS.VISIT_CHECK_IN,
      PERMISSIONS.VISIT_CHECK_OUT,
      PERMISSIONS.VISIT_APPROVE,
      PERMISSIONS.VISIT_REJECT,
      PERMISSIONS.VISIT_APPROVE_PRE_VISIT,
      PERMISSIONS.VISIT_APPROVE_CHECKIN,
      PERMISSIONS.VISIT_REJECT_CHECKIN,
      PERMISSIONS.VISIT_FORCE_CHECKIN,
      PERMISSIONS.VISIT_FORCE_CHECKOUT,
      PERMISSIONS.BRANCH_MANAGE,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.AUDIT_READ,
    ],
  },
  {
    name: "Receptionist",
    slug: SYSTEM_ROLE_SLUGS.RECEPTIONIST,
    description: "Front desk visitor registration and check-in operations",
    permissions: [
      PERMISSIONS.VISITOR_CREATE,
      PERMISSIONS.VISITOR_READ,
      PERMISSIONS.VISITOR_UPDATE,
      PERMISSIONS.VISIT_CHECK_IN,
      PERMISSIONS.VISIT_CHECK_OUT,
      PERMISSIONS.VISIT_APPROVE_PRE_VISIT,
      PERMISSIONS.VISIT_APPROVE_CHECKIN,
      PERMISSIONS.VISIT_REJECT_CHECKIN,
    ],
  },
  {
    name: "Security",
    slug: SYSTEM_ROLE_SLUGS.SECURITY,
    description: "Visitor verification and check-in/out at entry points",
    permissions: [
      PERMISSIONS.VISITOR_READ,
      PERMISSIONS.VISIT_CHECK_IN,
      PERMISSIONS.VISIT_CHECK_OUT,
      PERMISSIONS.VISIT_FORCE_CHECKIN,
      PERMISSIONS.VISIT_FORCE_CHECKOUT,
    ],
  },
  {
    name: "Viewer",
    slug: SYSTEM_ROLE_SLUGS.VIEWER,
    description: "Read-only access to visitors and audit history",
    permissions: [PERMISSIONS.VISITOR_READ, PERMISSIONS.AUDIT_READ],
  },
  {
    name: "Host",
    slug: SYSTEM_ROLE_SLUGS.HOST,
    description: "Receives visitors; assigned as the visit host",
    permissions: [PERMISSIONS.VISITOR_READ],
  },
];
