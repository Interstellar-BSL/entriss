import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { SYSTEM_ROLE_SLUGS } from "@/lib/rbac/roles";
import type { TenantContext } from "@/lib/tenant/tenant-context";

const PLATFORM_ADMIN_CACHE_TTL_MS = 5 * 60 * 1000;

export type PlatformAdminRecipient = {
  id: string;
  email: string;
};

let platformAdminCache: {
  recipients: PlatformAdminRecipient[];
  expiresAt: number;
} | null = null;

export function clearPlatformAdminRecipientCache() {
  platformAdminCache = null;
}

export async function resolvePlatformAdminRecipients(): Promise<
  PlatformAdminRecipient[]
> {
  const now = Date.now();
  if (platformAdminCache && platformAdminCache.expiresAt > now) {
    return platformAdminCache.recipients;
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      systemRole: { in: ["PLATFORM_ADMIN", "SYSTEM_OWNER"] },
    },
    select: { id: true, email: true },
  });

  const recipients = users
    .map((user) => ({
      id: user.id,
      email: user.email.trim(),
    }))
    .filter((user) => Boolean(user.email));

  platformAdminCache = {
    recipients,
    expiresAt: now + PLATFORM_ADMIN_CACHE_TTL_MS,
  };

  return recipients;
}

export async function resolvePlatformAdminUserIds(): Promise<string[]> {
  const admins = await resolvePlatformAdminRecipients();
  return admins.map((admin) => admin.id);
}

export async function resolveOrgAdminUserIds(
  ctx: TenantContext,
): Promise<string[]> {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: ctx.organizationId,
      isActive: true,
      role: {
        slug: {
          in: [
            SYSTEM_ROLE_SLUGS.OWNER,
            SYSTEM_ROLE_SLUGS.ORG_ADMIN,
            SYSTEM_ROLE_SLUGS.ADMIN,
          ],
        },
      },
    },
    select: { userId: true },
  });

  return [...new Set(members.map((member) => member.userId))];
}

export async function resolveApproverUserIds(
  ctx: TenantContext,
  visit: { branchId: string; hostMemberId: string },
): Promise<string[]> {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: ctx.organizationId,
      isActive: true,
      OR: [
        { id: visit.hostMemberId },
        {
          role: {
            permissions: {
              some: {
                permission: {
                  slug: {
                    in: [
                      PERMISSIONS.VISIT_APPROVE_PRE_VISIT,
                      PERMISSIONS.VISIT_APPROVE,
                      PERMISSIONS.BRANCH_MANAGE,
                      PERMISSIONS.USER_MANAGE,
                    ],
                  },
                },
              },
            },
          },
        },
      ],
    },
    select: { userId: true },
  });

  return [...new Set(members.map((member) => member.userId))];
}

export async function resolveBranchAdminUserIds(
  ctx: TenantContext,
  _branchId: string,
): Promise<string[]> {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: ctx.organizationId,
      isActive: true,
      role: {
        permissions: {
          some: {
            permission: {
              slug: {
                in: [PERMISSIONS.BRANCH_MANAGE, PERMISSIONS.USER_MANAGE],
              },
            },
          },
        },
      },
    },
    select: { userId: true },
  });

  return [...new Set(members.map((member) => member.userId))];
}

export async function resolveSecurityUserIds(
  ctx: TenantContext,
): Promise<string[]> {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: ctx.organizationId,
      isActive: true,
      role: {
        permissions: {
          some: {
            permission: {
              slug: PERMISSIONS.VISIT_FORCE_CHECKIN,
            },
          },
        },
      },
    },
    select: { userId: true },
  });

  return [...new Set(members.map((member) => member.userId))];
}

export function uniqueRecipientIds(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}
