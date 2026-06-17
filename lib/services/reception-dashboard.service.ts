import { ApprovalStatus, VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { visitInclude } from "./internal/visit-include";
import { countManualOverridesToday } from "./visit-override.service";

const SECTION_LIMIT = 25;
const RESCUE_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const EXPECTED_ARRIVAL_WINDOW_MS = 2 * 60 * 60 * 1000;

const KIOSK_ACTIVITY_EVENT_TYPES = [
  "qr.check_in.success",
  "qr.check_in.failed",
  "qr.verify.success",
  "qr.verify.failed",
  "qr.check_out.success",
  "qr.check_out.failed",
  "check_in.capture",
] as const;

const CHECKED_IN_EVENT_TYPES = [
  "visit.checked_in.manual",
  "visit.checked_in.qr",
  "check_in.manual",
  "check_in.approved",
] as const;

export type ReceptionApprovalKind = "PENDING" | "APPROVAL_REQUIRED";

export type KioskRecoveryStep =
  | "identity"
  | "capture"
  | "review"
  | "approval_wait";

export type AbandonedRegistrationStage = "registration" | "capture" | "review";

export interface ReceptionDashboardVisitor {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

export interface ReceptionDashboardVisitRow {
  visitId: string;
  status: VisitStatus;
  scheduledAt: string | null;
  checkedInAt: string | null;
  createdAt: string;
  visitor: ReceptionDashboardVisitor;
  host: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
}

export interface ReceptionPendingApprovalRow extends ReceptionDashboardVisitRow {
  approvalKind: ReceptionApprovalKind;
}

export interface ReceptionCheckedInRow extends ReceptionDashboardVisitRow {
  durationMinutes: number;
}

export interface ReceptionOverdueRow extends ReceptionDashboardVisitRow {
  expectedDepartureAt: string;
  overdueMinutes: number;
}

export interface ReceptionFailedKioskSession {
  visitId: string;
  status: VisitStatus;
  visitor: ReceptionDashboardVisitor;
  host: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
  lastKioskStep: KioskRecoveryStep;
  lastActivityAt: string;
}

export interface ReceptionAbandonedRegistration {
  visitId: string;
  status: VisitStatus;
  visitor: ReceptionDashboardVisitor;
  host: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
  startedAt: string;
  progressStage: AbandonedRegistrationStage;
}

export interface ReceptionDashboardMetrics {
  todayArrivals: number;
  checkedInNow: number;
  pendingApprovals: number;
  overdueVisitors: number;
  walkInsToday: number;
  manualOverridesToday: {
    forceCheckIns: number;
    forceCheckOuts: number;
    total: number;
  } | null;
}

export interface ReceptionDashboard {
  todayArrivals: ReceptionDashboardVisitRow[];
  currentlyCheckedIn: ReceptionCheckedInRow[];
  pendingApprovals: ReceptionPendingApprovalRow[];
  expectedArrivals: ReceptionDashboardVisitRow[];
  overdueVisitors: ReceptionOverdueRow[];
  abandonedRegistrations: ReceptionAbandonedRegistration[];
  failedKioskSessions: ReceptionFailedKioskSession[];
  metrics: ReceptionDashboardMetrics;
}

type VisitWithRelations = Awaited<
  ReturnType<typeof prisma.visit.findMany>
>[number] & {
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
  host: {
    id: string;
    user: { name: string | null; email: string };
  };
  branch: {
    id: string;
    name: string;
    autoCheckoutHours: number | null;
  };
};

type VisitEventRow = {
  type: string;
  createdAt: Date;
};

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function hostDisplayName(host: VisitWithRelations["host"]) {
  return host.user.name?.trim() || host.user.email;
}

function mapVisitRow(visit: VisitWithRelations): ReceptionDashboardVisitRow {
  return {
    visitId: visit.id,
    status: visit.status as VisitStatus,
    scheduledAt: visit.scheduledAt?.toISOString() ?? null,
    checkedInAt: visit.checkedInAt?.toISOString() ?? null,
    createdAt: visit.createdAt.toISOString(),
    visitor: {
      id: visit.visitor.id,
      firstName: visit.visitor.firstName,
      lastName: visit.visitor.lastName,
      photoUrl: visit.visitor.photoUrl,
    },
    host: {
      id: visit.host.id,
      name: hostDisplayName(visit.host),
    },
    branch: {
      id: visit.branch.id,
      name: visit.branch.name,
    },
  };
}

function durationMinutesSince(value: Date | string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const start = new Date(value).getTime();
  const elapsed = Math.max(0, Date.now() - start);
  return Math.floor(elapsed / 60_000);
}

function hasCheckedInEvent(events: VisitEventRow[]): boolean {
  return events.some((event) => CHECKED_IN_EVENT_TYPES.includes(event.type as (typeof CHECKED_IN_EVENT_TYPES)[number]));
}

function inferKioskRecoveryStep(
  status: VisitStatus,
  events: VisitEventRow[],
): KioskRecoveryStep {
  if (status === VisitStatus.PENDING) {
    return "approval_wait";
  }

  const hasCapture = events.some((event) => event.type === "check_in.capture");
  const hasKioskActivity = events.some((event) =>
    KIOSK_ACTIVITY_EVENT_TYPES.includes(
      event.type as (typeof KIOSK_ACTIVITY_EVENT_TYPES)[number],
    ),
  );

  if (hasCapture) {
    return "review";
  }

  if (hasKioskActivity) {
    return "capture";
  }

  return "identity";
}

function inferAbandonedStage(
  status: VisitStatus,
  events: VisitEventRow[],
): AbandonedRegistrationStage {
  const hasCapture = events.some((event) => event.type === "check_in.capture");

  if (hasCapture) {
    return "review";
  }

  if (status === VisitStatus.APPROVED) {
    return "capture";
  }

  return "registration";
}

function buildOverdueRow(visit: VisitWithRelations): ReceptionOverdueRow | null {
  const hours = visit.branch.autoCheckoutHours;
  if (!hours || hours <= 0 || !visit.checkedInAt) {
    return null;
  }

  const expectedDepartureAt = new Date(visit.checkedInAt);
  expectedDepartureAt.setHours(expectedDepartureAt.getHours() + hours);

  if (Date.now() <= expectedDepartureAt.getTime()) {
    return null;
  }

  const overdueMinutes = durationMinutesSince(expectedDepartureAt);

  return {
    ...mapVisitRow(visit),
    expectedDepartureAt: expectedDepartureAt.toISOString(),
    overdueMinutes,
  };
}

export async function getFailedKioskSessions(
  ctx: TenantContext,
): Promise<ReceptionFailedKioskSession[]> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const since = new Date(Date.now() - RESCUE_LOOKBACK_MS);
  const activeStatuses: VisitStatus[] = [
    VisitStatus.PENDING,
    VisitStatus.APPROVED,
  ];

  const visits = await prisma.visit.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: { in: activeStatuses },
      events: {
        some: {
          createdAt: { gte: since },
          type: { in: [...KIOSK_ACTIVITY_EVENT_TYPES] },
        },
      },
    },
    include: {
      ...visitInclude,
      events: {
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { type: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: SECTION_LIMIT * 2,
  });

  const sessions: ReceptionFailedKioskSession[] = [];

  for (const visit of visits) {
    if (hasCheckedInEvent(visit.events)) {
      continue;
    }

    const lastEvent = visit.events[0];
    if (!lastEvent) {
      continue;
    }

    sessions.push({
      visitId: visit.id,
      status: visit.status as VisitStatus,
      visitor: {
        id: visit.visitor.id,
        firstName: visit.visitor.firstName,
        lastName: visit.visitor.lastName,
        photoUrl: visit.visitor.photoUrl,
      },
      host: {
        id: visit.host.id,
        name: hostDisplayName(visit.host),
      },
      branch: {
        id: visit.branch.id,
        name: visit.branch.name,
      },
      lastKioskStep: inferKioskRecoveryStep(
        visit.status as VisitStatus,
        visit.events,
      ),
      lastActivityAt: lastEvent.createdAt.toISOString(),
    });

    if (sessions.length >= SECTION_LIMIT) {
      break;
    }
  }

  return sessions;
}

async function getAbandonedRegistrations(
  ctx: TenantContext,
  since: Date,
): Promise<ReceptionAbandonedRegistration[]> {
  const visits = await prisma.visit.findMany({
    where: {
      organizationId: ctx.organizationId,
      scheduledAt: null,
      createdAt: { gte: since },
      status: { in: [VisitStatus.PENDING, VisitStatus.APPROVED] },
      NOT: {
        events: {
          some: {
            type: { in: [...KIOSK_ACTIVITY_EVENT_TYPES] },
          },
        },
      },
    },
    include: {
      ...visitInclude,
      events: {
        orderBy: { createdAt: "asc" },
        take: 10,
        select: { type: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: SECTION_LIMIT,
  });

  return visits.map((visit) => ({
    visitId: visit.id,
    status: visit.status as VisitStatus,
    visitor: {
      id: visit.visitor.id,
      firstName: visit.visitor.firstName,
      lastName: visit.visitor.lastName,
      photoUrl: visit.visitor.photoUrl,
    },
    host: {
      id: visit.host.id,
      name: hostDisplayName(visit.host),
    },
    branch: {
      id: visit.branch.id,
      name: visit.branch.name,
    },
    startedAt: visit.createdAt.toISOString(),
    progressStage: inferAbandonedStage(
      visit.status as VisitStatus,
      visit.events,
    ),
  }));
}

export async function getReceptionDashboard(
  ctx: TenantContext,
): Promise<ReceptionDashboard> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const { start: todayStart, end: todayEnd } = getTodayRange();
  const now = new Date();
  const expectedWindowEnd = new Date(now.getTime() + EXPECTED_ARRIVAL_WINDOW_MS);
  const rescueSince = new Date(Date.now() - RESCUE_LOOKBACK_MS);

  const tenantWhere = { organizationId: ctx.organizationId } as const;

  const [
    todayArrivals,
    todayArrivalsCount,
    checkedInVisits,
    checkedInCount,
    preVisitPending,
    checkInApprovalPending,
    expectedArrivals,
    overdueCandidates,
    walkInsTodayCount,
    failedKioskSessions,
    abandonedRegistrations,
  ] = await Promise.all([
    prisma.visit.findMany({
      where: {
        ...tenantWhere,
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
      include: visitInclude,
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
      take: SECTION_LIMIT,
    }),
    prisma.visit.count({
      where: {
        ...tenantWhere,
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.visit.findMany({
      where: {
        ...tenantWhere,
        status: VisitStatus.CHECKED_IN,
      },
      include: visitInclude,
      orderBy: [{ checkedInAt: "desc" }, { updatedAt: "desc" }],
      take: SECTION_LIMIT,
    }),
    prisma.visit.count({
      where: {
        ...tenantWhere,
        status: VisitStatus.CHECKED_IN,
      },
    }),
    prisma.visit.findMany({
      where: {
        ...tenantWhere,
        status: VisitStatus.PENDING,
      },
      include: visitInclude,
      orderBy: [{ createdAt: "desc" }],
      take: SECTION_LIMIT,
    }),
    prisma.visit.findMany({
      where: {
        ...tenantWhere,
        status: VisitStatus.APPROVED,
        approvals: {
          some: { status: ApprovalStatus.PENDING },
        },
      },
      include: visitInclude,
      orderBy: [{ updatedAt: "desc" }],
      take: SECTION_LIMIT,
    }),
    prisma.visit.findMany({
      where: {
        ...tenantWhere,
        scheduledAt: { gte: now, lte: expectedWindowEnd },
        status: { in: [VisitStatus.APPROVED, VisitStatus.PENDING] },
      },
      include: visitInclude,
      orderBy: [{ scheduledAt: "asc" }],
      take: SECTION_LIMIT,
    }),
    prisma.visit.findMany({
      where: {
        ...tenantWhere,
        status: VisitStatus.CHECKED_IN,
        checkedInAt: { not: null },
        branch: { autoCheckoutHours: { not: null, gt: 0 } },
      },
      include: visitInclude,
      orderBy: [{ checkedInAt: "asc" }],
      take: SECTION_LIMIT * 2,
    }),
    prisma.visit.count({
      where: {
        ...tenantWhere,
        scheduledAt: null,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    getFailedKioskSessions(ctx),
    getAbandonedRegistrations(ctx, rescueSince),
  ]);

  const pendingApprovalMap = new Map<string, ReceptionPendingApprovalRow>();

  for (const visit of preVisitPending) {
    pendingApprovalMap.set(visit.id, {
      ...mapVisitRow(visit),
      approvalKind: "PENDING",
    });
  }

  for (const visit of checkInApprovalPending) {
    if (!pendingApprovalMap.has(visit.id)) {
      pendingApprovalMap.set(visit.id, {
        ...mapVisitRow(visit),
        approvalKind: "APPROVAL_REQUIRED",
      });
    }
  }

  const pendingApprovals = [...pendingApprovalMap.values()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  const overdueVisitors = overdueCandidates
    .map((visit) => buildOverdueRow(visit))
    .filter((row): row is ReceptionOverdueRow => row !== null)
    .sort((left, right) => right.overdueMinutes - left.overdueMinutes)
    .slice(0, SECTION_LIMIT);

  const overdueCount = overdueCandidates.reduce((count, visit) => {
    return buildOverdueRow(visit) ? count + 1 : count;
  }, 0);

  const preVisitPendingCount = await prisma.visit.count({
    where: {
      ...tenantWhere,
      status: VisitStatus.PENDING,
    },
  });

  const checkInApprovalPendingCount = await prisma.visit.count({
    where: {
      ...tenantWhere,
      status: VisitStatus.APPROVED,
      approvals: {
        some: { status: ApprovalStatus.PENDING },
      },
    },
  });

  const manualOverridesToday = await countManualOverridesToday(ctx);

  return {
    todayArrivals: todayArrivals.map(mapVisitRow),
    currentlyCheckedIn: checkedInVisits.map((visit) => ({
      ...mapVisitRow(visit),
      durationMinutes: durationMinutesSince(visit.checkedInAt),
    })),
    pendingApprovals,
    expectedArrivals: expectedArrivals.map(mapVisitRow),
    overdueVisitors,
    abandonedRegistrations,
    failedKioskSessions,
    metrics: {
      todayArrivals: todayArrivalsCount,
      checkedInNow: checkedInCount,
      pendingApprovals: preVisitPendingCount + checkInApprovalPendingCount,
      overdueVisitors: overdueCount,
      walkInsToday: walkInsTodayCount,
      manualOverridesToday,
    },
  };
}
