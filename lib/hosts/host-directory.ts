import "server-only";

import { MemberStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { enforcePermission } from "@/lib/rbac/enforce";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import type { HostDirectoryEntry } from "./types";

export type { HostDirectoryEntry } from "./types";

const hostMemberSelect = {
  id: true,
  user: {
    select: {
      name: true,
      email: true,
    },
  },
  role: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

type HostMemberRow = {
  id: string;
  user: { name: string | null; email: string };
  role: { id: string; name: string; slug: string };
};

function activeHostWhere(organizationId: string) {
  return {
    organizationId,
    isActive: true,
    deactivatedAt: null,
    status: MemberStatus.ACTIVE,
    user: { isActive: true },
  };
}

function mapMemberToHostDirectoryEntry(member: HostMemberRow): HostDirectoryEntry {
  return {
    id: member.id,
    name: member.user.name?.trim() || member.user.email,
    email: member.user.email,
    role: member.role,
    department: "",
  };
}

function sortHosts(hosts: HostDirectoryEntry[]) {
  return [...hosts].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listActiveHosts(
  ctx: TenantContext,
): Promise<HostDirectoryEntry[]> {
  enforcePermission(ctx, PERMISSIONS.VISITOR_READ);

  const members = await prisma.organizationMember.findMany({
    where: activeHostWhere(ctx.organizationId),
    select: hostMemberSelect,
    orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
  });

  return sortHosts(members.map(mapMemberToHostDirectoryEntry));
}

export async function getHostById(
  ctx: TenantContext,
  hostMemberId: string,
): Promise<HostDirectoryEntry | null> {
  enforcePermission(ctx, PERMISSIONS.VISITOR_READ);

  const member = await prisma.organizationMember.findFirst({
    where: {
      id: hostMemberId,
      ...activeHostWhere(ctx.organizationId),
    },
    select: hostMemberSelect,
  });

  if (!member) {
    return null;
  }

  return mapMemberToHostDirectoryEntry(member);
}

export async function searchHosts(
  ctx: TenantContext,
  query: string,
): Promise<HostDirectoryEntry[]> {
  enforcePermission(ctx, PERMISSIONS.VISITOR_READ);

  const trimmed = query.trim();
  if (!trimmed) {
    return listActiveHosts(ctx);
  }

  const members = await prisma.organizationMember.findMany({
    where: {
      ...activeHostWhere(ctx.organizationId),
      OR: [
        { user: { name: { contains: trimmed, mode: "insensitive" } } },
        { user: { email: { contains: trimmed, mode: "insensitive" } } },
      ],
    },
    select: hostMemberSelect,
    orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
    take: 25,
  });

  return sortHosts(members.map(mapMemberToHostDirectoryEntry));
}
