import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { visitInclude } from "./internal/visit-include";
import { getVisitorById } from "./visitor.service";

function hostDisplayName(host: {
  user: { name: string | null; email: string };
}): string {
  return host.user.name?.trim() || host.user.email;
}

function computeDurationMinutes(
  checkedInAt: Date | null,
  checkedOutAt: Date | null,
): number | null {
  if (!checkedInAt || !checkedOutAt) {
    return null;
  }

  const durationMs = checkedOutAt.getTime() - checkedInAt.getTime();
  if (durationMs < 0) {
    return null;
  }

  return Math.round(durationMs / 60_000);
}

export interface VisitorLastVisitResult {
  visit: {
    id: string;
    status: string;
    purpose: string | null;
    scheduledAt: Date | null;
  };
  host: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  durationMinutes: number | null;
}

export async function getLastVisit(
  ctx: TenantContext,
  visitorId: string,
): Promise<VisitorLastVisitResult | null> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  await getVisitorById(ctx, visitorId);

  const visit = await prisma.visit.findFirst({
    where: {
      organizationId: ctx.organizationId,
      visitorId,
    },
    include: visitInclude,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (!visit) {
    return null;
  }

  return {
    visit: {
      id: visit.id,
      status: visit.status,
      purpose: visit.purpose,
      scheduledAt: visit.scheduledAt,
    },
    host: {
      id: visit.host.id,
      name: hostDisplayName(visit.host),
    },
    branch: {
      id: visit.branch.id,
      name: visit.branch.name,
    },
    checkedInAt: visit.checkedInAt,
    checkedOutAt: visit.checkedOutAt,
    durationMinutes: computeDurationMinutes(
      visit.checkedInAt,
      visit.checkedOutAt,
    ),
  };
}
