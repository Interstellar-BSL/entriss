import { writeAuditLog } from "@/lib/audit/logger";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import {
  normalizeVisitorTags,
  type VisitorTag,
} from "@/lib/visitors/tags";

import { getVisitorById } from "./visitor.service";

export interface VisitorTagsResult {
  visitorId: string;
  tags: VisitorTag[];
}

export async function getVisitorTags(
  ctx: TenantContext,
  visitorId: string,
): Promise<VisitorTagsResult> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visitor = await getVisitorById(ctx, visitorId);

  return {
    visitorId: visitor.id,
    tags: normalizeVisitorTags(visitor.visitorTags),
  };
}

export async function updateVisitorTags(
  ctx: TenantContext,
  visitorId: string,
  tags: VisitorTag[],
): Promise<VisitorTagsResult> {
  requirePermission(ctx, PERMISSIONS.VISITOR_UPDATE);
  await getVisitorById(ctx, visitorId);

  const normalizedTags = normalizeVisitorTags(tags);

  const visitor = await prisma.visitor.update({
    where: { id: visitorId },
    data: {
      visitorTags: [...normalizedTags],
    },
    select: {
      id: true,
      visitorTags: true,
    },
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "VISITOR_TAGS_UPDATED",
    resourceType: "Visitor",
    resourceId: visitorId,
    metadata: {
      visitorId,
      tags: normalizedTags,
    },
  });

  return {
    visitorId: visitor.id,
    tags: normalizeVisitorTags(visitor.visitorTags),
  };
}
