import { VisitStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import { normalizePhone } from "@/lib/validations/visitor";
import {
  normalizeVisitorTags,
  type VisitorTag,
} from "@/lib/visitors/tags";

import type { VisitorType } from "./visitor-insights.service";

const MAX_RESULTS = 20;
const DORMANT_DAYS = 180;

export interface UnifiedSearchVisitorResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  company: string | null;
  tags: VisitorTag[];
  visitorType: VisitorType;
  lastVisitAt: string | null;
  matchTier: number;
}

export interface UnifiedSearchVisitResult {
  id: string;
  status: VisitStatus;
  purpose: string | null;
  scheduledAt: string | null;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  host: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
  matchTier: number;
}

export interface UnifiedSearchCheckedInResult {
  visitId: string;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
  host: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
  checkedInAt: string;
  durationMinutes: number | null;
  matchTier: number;
}

export interface UnifiedSearchResult {
  visitors: UnifiedSearchVisitorResult[];
  visits: UnifiedSearchVisitResult[];
  checkedIn: UnifiedSearchCheckedInResult[];
}

type VisitorRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  company: string | null;
  visitorTags: string[];
};

type VisitRow = {
  id: string;
  status: VisitStatus;
  purpose: string | null;
  scheduledAt: Date | null;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  qrToken: string | null;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    photoUrl: string | null;
    company: string | null;
    visitorTags: string[];
  };
  branch: {
    id: string;
    name: string;
  };
  host: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
  };
};

const visitSearchSelect = {
  id: true,
  status: true,
  purpose: true,
  scheduledAt: true,
  checkedInAt: true,
  checkedOutAt: true,
  qrToken: true,
  visitor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      photoUrl: true,
      company: true,
      visitorTags: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
    },
  },
  host: {
    select: {
      id: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
} as const;

const visitorSearchSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  photoUrl: true,
  company: true,
  visitorTags: true,
} as const;

function hostDisplayName(host: {
  user: { name: string | null; email: string };
}): string {
  return host.user.name?.trim() || host.user.email;
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

function looksLikePhone(value: string): boolean {
  return /^\+?[\d\s().-]{5,}$/.test(value);
}

function normalizeEmail(value: string): string {
  return value.toLowerCase().trim();
}

function tryNormalizePhone(value: string): string | null {
  if (!looksLikePhone(value)) {
    return null;
  }

  try {
    return normalizePhone(value);
  } catch {
    return value.replace(/\s/g, "");
  }
}

function statusFromQuery(queryLower: string): VisitStatus | null {
  const normalized = queryLower.replace(/[\s-]+/g, "_").toUpperCase();
  const values = Object.values(VisitStatus) as string[];
  if (values.includes(normalized)) {
    return normalized as VisitStatus;
  }

  const aliases: Record<string, VisitStatus> = {
    CHECKEDIN: VisitStatus.CHECKED_IN,
    CHECKEDOUT: VisitStatus.CHECKED_OUT,
    CANCELLED: VisitStatus.CANCELLED,
    CANCELED: VisitStatus.CANCELLED,
    PENDING: VisitStatus.PENDING,
    APPROVED: VisitStatus.APPROVED,
    REJECTED: VisitStatus.REJECTED,
  };

  const compact = queryLower.replace(/[\s_-]+/g, "").toUpperCase();
  return aliases[compact] ?? null;
}

function matchingTags(queryLower: string): VisitorTag[] {
  const matches: VisitorTag[] = [];

  for (const tag of [
    "VIP",
    "WATCHLIST",
    "REQUIRES_ESCORT",
    "CONTRACTOR",
    "FREQUENT_VISITOR",
  ] as const) {
    const label = tag.toLowerCase().replaceAll("_", " ");
    if (
      tag.toLowerCase().includes(queryLower) ||
      label.includes(queryLower) ||
      queryLower.includes(tag.toLowerCase())
    ) {
      matches.push(tag);
    }
  }

  return matches;
}

function computeDaysSince(date: Date | null): number | null {
  if (!date) {
    return null;
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) {
    return 0;
  }

  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

function resolveVisitorType(
  visitCount: number,
  lastVisitAt: Date | null,
): VisitorType {
  const daysSinceLastVisit = computeDaysSince(lastVisitAt);

  if (daysSinceLastVisit !== null && daysSinceLastVisit >= DORMANT_DAYS) {
    return "DORMANT";
  }

  if (visitCount <= 1) {
    return "FIRST_TIME";
  }

  if (visitCount <= 4) {
    return "RETURNING";
  }

  if (visitCount <= 9) {
    return "FREQUENT";
  }

  return "VIP";
}

function visitMatchTier(visit: VisitRow, query: string, queryLower: string): number {
  const emailNorm = normalizeEmail(query);
  const phoneNorm = tryNormalizePhone(query);
  const statusMatch = statusFromQuery(queryLower);

  if (visit.id === query) {
    return 1;
  }

  if (visit.qrToken && visit.qrToken === query) {
    return 2;
  }

  if (
    (visit.visitor.email && normalizeEmail(visit.visitor.email) === emailNorm) ||
    normalizeEmail(visit.host.user.email) === emailNorm
  ) {
    return 3;
  }

  if (
    (phoneNorm && visit.visitor.phone === phoneNorm) ||
    (phoneNorm && visit.visitor.phone?.replace(/\s/g, "") === phoneNorm)
  ) {
    return 4;
  }

  const fullName =
    `${visit.visitor.firstName} ${visit.visitor.lastName}`.toLowerCase();

  if (
    visit.visitor.firstName.toLowerCase().includes(queryLower) ||
    visit.visitor.lastName.toLowerCase().includes(queryLower) ||
    fullName.includes(queryLower)
  ) {
    return 5;
  }

  if (visit.visitor.company?.toLowerCase().includes(queryLower)) {
    return 6;
  }

  const hostName = hostDisplayName(visit.host).toLowerCase();
  if (hostName.includes(queryLower)) {
    return 7;
  }

  if (visit.purpose?.toLowerCase().includes(queryLower)) {
    return 8;
  }

  if (statusMatch && visit.status === statusMatch) {
    return 8;
  }

  if (visit.branch.name.toLowerCase().includes(queryLower)) {
    return 8;
  }

  const tags = matchingTags(queryLower);
  if (
    tags.some((tag) => normalizeVisitorTags(visit.visitor.visitorTags).includes(tag))
  ) {
    return 8;
  }

  return 9;
}

function visitorMatchTier(visitor: VisitorRow, query: string, queryLower: string): number {
  const emailNorm = normalizeEmail(query);
  const phoneNorm = tryNormalizePhone(query);

  if (visitor.id === query) {
    return 1;
  }

  if (visitor.email && normalizeEmail(visitor.email) === emailNorm) {
    return 3;
  }

  if (
    phoneNorm &&
    (visitor.phone === phoneNorm ||
      visitor.phone?.replace(/\s/g, "") === phoneNorm)
  ) {
    return 4;
  }

  const fullName = `${visitor.firstName} ${visitor.lastName}`.toLowerCase();

  if (
    visitor.firstName.toLowerCase().includes(queryLower) ||
    visitor.lastName.toLowerCase().includes(queryLower) ||
    fullName.includes(queryLower)
  ) {
    return 5;
  }

  if (visitor.company?.toLowerCase().includes(queryLower)) {
    return 6;
  }

  const tags = matchingTags(queryLower);
  if (tags.some((tag) => normalizeVisitorTags(visitor.visitorTags).includes(tag))) {
    return 8;
  }

  return 9;
}

function buildVisitSearchWhere(
  ctx: TenantContext,
  query: string,
  queryLower: string,
) {
  const emailNorm = looksLikeEmail(query) ? normalizeEmail(query) : null;
  const phoneNorm = tryNormalizePhone(query);
  const statusMatch = statusFromQuery(queryLower);
  const tagMatches = matchingTags(queryLower);
  const nameParts = query.split(/\s+/);

  const visitorNameOr: Array<Record<string, unknown>> = [
    { firstName: { contains: query, mode: "insensitive" } },
    { lastName: { contains: query, mode: "insensitive" } },
    { company: { contains: query, mode: "insensitive" } },
  ];

  if (nameParts.length >= 2) {
    visitorNameOr.push({
      AND: [
        { firstName: { contains: nameParts[0], mode: "insensitive" } },
        {
          lastName: {
            contains: nameParts.slice(1).join(" "),
            mode: "insensitive",
          },
        },
      ],
    });
  }

  const orConditions: Array<Record<string, unknown>> = [
    { id: query },
    { qrToken: query },
    { purpose: { contains: query, mode: "insensitive" } },
    { branch: { name: { contains: query, mode: "insensitive" } } },
    {
      host: {
        OR: [
          { user: { name: { contains: query, mode: "insensitive" } } },
          ...(emailNorm
            ? [{ user: { email: { equals: emailNorm, mode: "insensitive" } } }]
            : []),
        ],
      },
    },
    {
      visitor: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        OR: [
          { id: query },
          ...visitorNameOr,
          ...(emailNorm
            ? [{ email: { equals: emailNorm, mode: "insensitive" } }]
            : []),
          ...(phoneNorm ? [{ phone: phoneNorm }, { phone: { contains: query } }] : []),
          ...(tagMatches.length > 0
            ? [{ visitorTags: { hasSome: tagMatches } }]
            : []),
        ],
      },
    },
  ];

  if (statusMatch) {
    orConditions.push({ status: statusMatch });
  }

  return {
    organizationId: ctx.organizationId,
    OR: orConditions,
  };
}

function buildVisitorSearchWhere(
  ctx: TenantContext,
  query: string,
  queryLower: string,
  noteVisitorIds: string[],
) {
  const emailNorm = looksLikeEmail(query) ? normalizeEmail(query) : null;
  const phoneNorm = tryNormalizePhone(query);
  const tagMatches = matchingTags(queryLower);
  const nameParts = query.split(/\s+/);

  const orConditions: Array<Record<string, unknown>> = [
    { id: query },
    { firstName: { contains: query, mode: "insensitive" } },
    { lastName: { contains: query, mode: "insensitive" } },
    { company: { contains: query, mode: "insensitive" } },
    ...(emailNorm ? [{ email: { equals: emailNorm, mode: "insensitive" } }] : []),
    ...(phoneNorm ? [{ phone: phoneNorm }, { phone: { contains: query } }] : []),
    ...(tagMatches.length > 0 ? [{ visitorTags: { hasSome: tagMatches } }] : []),
    ...(noteVisitorIds.length > 0 ? [{ id: { in: noteVisitorIds } }] : []),
  ];

  if (nameParts.length >= 2) {
    orConditions.push({
      AND: [
        { firstName: { contains: nameParts[0], mode: "insensitive" } },
        {
          lastName: {
            contains: nameParts.slice(1).join(" "),
            mode: "insensitive",
          },
        },
      ],
    });
  }

  return {
    organizationId: ctx.organizationId,
    deletedAt: null,
    isActive: true,
    OR: orConditions,
  };
}

async function loadVisitorVisitStats(visitorIds: string[], organizationId: string) {
  if (visitorIds.length === 0) {
    return new Map<string, { visitCount: number; lastVisitAt: Date | null }>();
  }

  const grouped = await prisma.visit.groupBy({
    by: ["visitorId"],
    where: {
      organizationId,
      visitorId: { in: visitorIds },
    },
    _count: { id: true },
    _max: { createdAt: true },
  });

  return new Map(
    grouped.map((entry) => [
      entry.visitorId,
      {
        visitCount: entry._count.id,
        lastVisitAt: entry._max.createdAt,
      },
    ]),
  );
}

function mapVisitResult(visit: VisitRow, tier: number): UnifiedSearchVisitResult {
  return {
    id: visit.id,
    status: visit.status,
    purpose: visit.purpose,
    scheduledAt: visit.scheduledAt?.toISOString() ?? null,
    visitor: {
      id: visit.visitor.id,
      firstName: visit.visitor.firstName,
      lastName: visit.visitor.lastName,
    },
    host: {
      id: visit.host.id,
      name: hostDisplayName(visit.host),
    },
    branch: {
      id: visit.branch.id,
      name: visit.branch.name,
    },
    matchTier: tier,
  };
}

function computeCheckedInDurationMinutes(visit: VisitRow): number | null {
  if (!visit.checkedInAt) {
    return null;
  }

  const durationMs = Date.now() - visit.checkedInAt.getTime();
  if (durationMs < 0) {
    return null;
  }

  return Math.round(durationMs / 60_000);
}

export async function searchUnified(
  ctx: TenantContext,
  query: string,
): Promise<UnifiedSearchResult> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const normalized = normalizeQuery(query);
  if (normalized.length < 2) {
    return { visitors: [], visits: [], checkedIn: [] };
  }

  const queryLower = normalized.toLowerCase();

  const noteMatches = await prisma.visitorNote.findMany({
    where: {
      organizationId: ctx.organizationId,
      note: { contains: normalized, mode: "insensitive" },
    },
    select: { visitorId: true },
    take: MAX_RESULTS,
  });

  const noteVisitorIds = [...new Set(noteMatches.map((note) => note.visitorId))];

  const [visitRows, visitorRows] = await Promise.all([
    prisma.visit.findMany({
      where: buildVisitSearchWhere(ctx, normalized, queryLower),
      select: visitSearchSelect,
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS * 2,
    }),
    prisma.visitor.findMany({
      where: buildVisitorSearchWhere(
        ctx,
        normalized,
        queryLower,
        noteVisitorIds,
      ),
      select: visitorSearchSelect,
      orderBy: { updatedAt: "desc" },
      take: MAX_RESULTS * 2,
    }),
  ]);

  const visitTierMap = new Map<string, { visit: VisitRow; tier: number }>();

  for (const visit of visitRows as VisitRow[]) {
    const tier = visitMatchTier(visit, normalized, queryLower);
    const noteTier = noteVisitorIds.includes(visit.visitor.id) ? 8 : tier;
    const resolvedTier = Math.min(tier, noteTier);
    const existing = visitTierMap.get(visit.id);

    if (!existing || resolvedTier < existing.tier) {
      visitTierMap.set(visit.id, { visit, tier: resolvedTier });
    }
  }

  const sortedVisits = [...visitTierMap.values()]
    .sort((left, right) => {
      if (left.tier !== right.tier) {
        return left.tier - right.tier;
      }

      const leftDate = left.visit.scheduledAt ?? left.visit.checkedInAt;
      const rightDate = right.visit.scheduledAt ?? right.visit.checkedInAt;
      return (rightDate?.getTime() ?? 0) - (leftDate?.getTime() ?? 0);
    })
    .slice(0, MAX_RESULTS)
    .map(({ visit, tier }) => mapVisitResult(visit, tier));

  const visitVisitorIds = new Set(
    sortedVisits.map((visit) => visit.visitor.id),
  );

  const visitorTierMap = new Map<string, { visitor: VisitorRow; tier: number }>();

  for (const visitor of visitorRows as VisitorRow[]) {
    const tier = visitorMatchTier(visitor, normalized, queryLower);
    const noteTier = noteVisitorIds.includes(visitor.id) ? 8 : tier;
    const resolvedTier = Math.min(tier, noteTier);
    const existing = visitorTierMap.get(visitor.id);

    if (!existing || resolvedTier < existing.tier) {
      visitorTierMap.set(visitor.id, { visitor, tier: resolvedTier });
    }
  }

  for (const { visit, tier } of visitTierMap.values()) {
    if (visitorTierMap.has(visit.visitor.id)) {
      continue;
    }

    visitorTierMap.set(visit.visitor.id, {
      visitor: visit.visitor,
      tier: Math.min(tier, 5),
    });
  }

  const visitorIds = [...visitorTierMap.keys()];
  const stats = await loadVisitorVisitStats(visitorIds, ctx.organizationId);

  const sortedVisitors = [...visitorTierMap.values()]
    .sort((left, right) => {
      if (left.tier !== right.tier) {
        return left.tier - right.tier;
      }

      const leftDate = stats.get(left.visitor.id)?.lastVisitAt;
      const rightDate = stats.get(right.visitor.id)?.lastVisitAt;
      return (rightDate?.getTime() ?? 0) - (leftDate?.getTime() ?? 0);
    })
    .slice(0, MAX_RESULTS)
    .map(({ visitor, tier }) => {
      const visitorStats = stats.get(visitor.id);
      const visitCount = visitorStats?.visitCount ?? 0;
      const lastVisitAt = visitorStats?.lastVisitAt ?? null;

      return {
        id: visitor.id,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        email: visitor.email,
        phone: visitor.phone,
        photoUrl: visitor.photoUrl,
        company: visitor.company,
        tags: normalizeVisitorTags(visitor.visitorTags),
        visitorType: resolveVisitorType(visitCount, lastVisitAt),
        lastVisitAt: lastVisitAt?.toISOString() ?? null,
        matchTier: tier,
      } satisfies UnifiedSearchVisitorResult;
    });

  const checkedIn = [...visitTierMap.values()]
    .filter(({ visit }) => visit.status === VisitStatus.CHECKED_IN)
    .sort((left, right) => left.tier - right.tier)
    .slice(0, MAX_RESULTS)
    .map(({ visit, tier }) => ({
      visitId: visit.id,
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
      checkedInAt: visit.checkedInAt!.toISOString(),
      durationMinutes: computeCheckedInDurationMinutes(visit),
      matchTier: tier,
    }))
    .filter((entry) => entry.checkedInAt);

  return {
    visitors: sortedVisitors,
    visits: sortedVisits.filter((visit) => visit.status !== VisitStatus.CHECKED_IN),
    checkedIn,
  };
}
