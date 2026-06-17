import { VisitStatus } from "@/app/generated/prisma/enums";
import { isNoShowVisit } from "@/lib/visits/no-show";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { visitInclude } from "./internal/visit-include";
import { getVisitorById } from "./visitor.service";

export interface VisitorTimelineVisitor {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  createdAt: Date;
}

export interface VisitorTimelineMetrics {
  totalVisits: number;
  completedVisits: number;
  cancelledVisits: number;
  noShows: number;
  currentlyCheckedIn: number;
  averageVisitDurationMinutes: number | null;
  firstVisitAt: Date | null;
  lastVisitAt: Date | null;
}

export interface VisitorTimelineEntry {
  visitId: string;
  title: string;
  branchName: string;
  hostName: string;
  scheduledStart: Date | null;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  durationMinutes: number | null;
  status: VisitStatus;
  createdAt: Date;
  forcedCheckIn: boolean;
  forcedCheckOut: boolean;
}

export interface VisitorTimelineResult {
  visitor: VisitorTimelineVisitor;
  metrics: VisitorTimelineMetrics;
  timeline: VisitorTimelineEntry[];
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

function visitTimelineTitle(
  purpose: string | null,
  status: VisitStatus,
): string {
  if (purpose?.trim()) {
    return purpose.trim();
  }

  switch (status) {
    case VisitStatus.CHECKED_OUT:
      return "Completed visit";
    case VisitStatus.CHECKED_IN:
      return "Checked in";
    case VisitStatus.APPROVED:
      return "Scheduled visit";
    case VisitStatus.PENDING:
      return "Pending approval";
    case VisitStatus.CANCELLED:
      return "Cancelled visit";
    case VisitStatus.REJECTED:
      return "Rejected visit";
    default:
      return "Visit";
  }
}

function hostDisplayName(host: {
  user: { name: string | null; email: string };
}): string {
  return host.user.name?.trim() || host.user.email;
}

function resolveLastVisitAt(
  visits: Array<{
    checkedOutAt: Date | null;
    checkedInAt: Date | null;
    scheduledAt: Date | null;
    createdAt: Date;
  }>,
): Date | null {
  let latest: Date | null = null;

  for (const visit of visits) {
    const candidates = [
      visit.checkedOutAt,
      visit.checkedInAt,
      visit.scheduledAt,
      visit.createdAt,
    ].filter((value): value is Date => value instanceof Date);

    for (const candidate of candidates) {
      if (!latest || candidate.getTime() > latest.getTime()) {
        latest = candidate;
      }
    }
  }

  return latest;
}

export async function getVisitorTimeline(
  ctx: TenantContext,
  visitorId: string,
): Promise<VisitorTimelineResult> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visitor = await getVisitorById(ctx, visitorId);

  const visits = await prisma.visit.findMany({
    where: {
      organizationId: ctx.organizationId,
      visitorId,
    },
    include: visitInclude,
    orderBy: { createdAt: "desc" },
  });

  const completedDurations: number[] = [];

  let completedVisits = 0;
  let cancelledVisits = 0;
  let noShows = 0;
  let currentlyCheckedIn = 0;

  const timeline: VisitorTimelineEntry[] = visits.map((visit) => {
    const durationMinutes = computeDurationMinutes(
      visit.checkedInAt,
      visit.checkedOutAt,
    );

    if (visit.status === VisitStatus.CHECKED_OUT) {
      completedVisits += 1;
      if (durationMinutes !== null) {
        completedDurations.push(durationMinutes);
      }
    }

    if (visit.status === VisitStatus.CANCELLED) {
      cancelledVisits += 1;
    }

    if (visit.status === VisitStatus.CHECKED_IN) {
      currentlyCheckedIn += 1;
    }

    if (isNoShowVisit(visit)) {
      noShows += 1;
    }

    return {
      visitId: visit.id,
      title: visitTimelineTitle(visit.purpose, visit.status),
      branchName: visit.branch.name,
      hostName: hostDisplayName(visit.host),
      scheduledStart: visit.scheduledAt,
      checkedInAt: visit.checkedInAt,
      checkedOutAt: visit.checkedOutAt,
      durationMinutes,
      status: visit.status,
      createdAt: visit.createdAt,
      forcedCheckIn: Boolean(visit.checkedInById),
      forcedCheckOut: Boolean(visit.checkedOutById),
    };
  });

  const averageVisitDurationMinutes =
    completedDurations.length > 0
      ? Math.round(
          completedDurations.reduce((sum, value) => sum + value, 0) /
            completedDurations.length,
        )
      : null;

  const firstVisitAt =
    visits.length > 0 ? visits[visits.length - 1]!.createdAt : null;

  return {
    visitor: {
      id: visitor.id,
      fullName: `${visitor.firstName} ${visitor.lastName}`.trim(),
      email: visitor.email,
      phone: visitor.phone,
      photoUrl: visitor.photoUrl,
      createdAt: visitor.createdAt,
    },
    metrics: {
      totalVisits: visits.length,
      completedVisits,
      cancelledVisits,
      noShows,
      currentlyCheckedIn,
      averageVisitDurationMinutes,
      firstVisitAt,
      lastVisitAt: resolveLastVisitAt(visits),
    },
    timeline,
  };
}
