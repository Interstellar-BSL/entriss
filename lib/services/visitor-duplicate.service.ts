import { writeAuditLog } from "@/lib/audit/logger";
import { prisma } from "@/lib/db/client";
import { emitPlatformNotification } from "@/lib/notifications/platform-projector";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import { normalizePhone } from "@/lib/validations/visitor";

export type DuplicateConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface DuplicateVisitorEntry {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  photoUrl: string | null;
  visitCount: number;
  lastVisitAt: Date | null;
  createdAt: Date;
}

export interface DuplicateGroup {
  groupKey: string;
  confidence: DuplicateConfidence;
  reasons: string[];
  visitors: DuplicateVisitorEntry[];
}

const LOW_CONFIDENCE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const CONFIDENCE_RANK: Record<DuplicateConfidence, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

type VisitorRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  photoUrl: string | null;
  createdAt: Date;
};

class UnionFind {
  private readonly parent = new Map<string, string>();

  add(id: string): void {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
    }
  }

  find(id: string): string {
    const parent = this.parent.get(id) ?? id;
    if (parent !== id) {
      const root = this.find(parent);
      this.parent.set(id, root);
      return root;
    }
    return id;
  }

  union(a: string, b: string): void {
    this.add(a);
    this.add(b);
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }

  components(): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      const bucket = groups.get(root) ?? [];
      bucket.push(id);
      groups.set(root, bucket);
    }
    return groups;
  }
}

function normalizeEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase();
  return value || null;
}

function normalizePhoneValue(phone: string | null | undefined): string | null {
  if (!phone?.trim()) {
    return null;
  }

  try {
    return normalizePhone(phone.trim());
  } catch {
    return phone.trim().toLowerCase();
  }
}

function normalizeNameKey(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
}

function buildGroupKey(visitorIds: string[]): string {
  return [...visitorIds].sort().join(":");
}

function resolveLastActivity(
  createdAt: Date | null,
  checkedInAt: Date | null,
  checkedOutAt: Date | null,
): Date | null {
  const candidates = [createdAt, checkedInAt, checkedOutAt].filter(
    (value): value is Date => value instanceof Date,
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((latest, value) =>
    value.getTime() > latest.getTime() ? value : latest,
  );
}

function detectDuplicateGroups(visitors: VisitorRow[]): DuplicateGroup[] {
  const visitorMap = new Map(visitors.map((visitor) => [visitor.id, visitor]));
  const unionFind = new UnionFind();

  function link(ids: string[]): void {
    if (ids.length < 2) {
      return;
    }

    const sorted = [...ids].sort();
    for (let index = 1; index < sorted.length; index += 1) {
      unionFind.union(sorted[0]!, sorted[index]!);
    }
  }

  function applyRules(): void {
    for (const ids of emailBuckets.values()) {
      if (ids.length >= 2) {
        link(ids);
      }
    }

    for (const ids of phoneBuckets.values()) {
      if (ids.length >= 2) {
        link(ids);
      }
    }

    for (const ids of companyBuckets.values()) {
      if (ids.length >= 2) {
        link(ids);
      }
    }

    for (const bucket of nameBuckets.values()) {
      for (let left = 0; left < bucket.length; left += 1) {
        for (let right = left + 1; right < bucket.length; right += 1) {
          const delta = Math.abs(
            bucket[left]!.createdAt.getTime() - bucket[right]!.createdAt.getTime(),
          );
          if (delta <= LOW_CONFIDENCE_WINDOW_MS) {
            link([bucket[left]!.id, bucket[right]!.id]);
          }
        }
      }
    }
  }

  function resolveGroupSignals(group: VisitorRow[]): {
    confidence: DuplicateConfidence;
    reasons: string[];
  } {
    const reasons = new Set<string>();
    let confidence: DuplicateConfidence = "LOW";

    function bump(level: DuplicateConfidence, reason: string) {
      reasons.add(reason);
      if (CONFIDENCE_RANK[level] > CONFIDENCE_RANK[confidence]) {
        confidence = level;
      }
    }

    for (let left = 0; left < group.length; left += 1) {
      for (let right = left + 1; right < group.length; right += 1) {
        const a = group[left]!;
        const b = group[right]!;

        const emailA = normalizeEmail(a.email);
        const emailB = normalizeEmail(b.email);
        if (emailA && emailB && emailA === emailB) {
          bump("HIGH", "Same email");
        }

        const phoneA = normalizePhoneValue(a.phone);
        const phoneB = normalizePhoneValue(b.phone);
        if (phoneA && phoneB && phoneA === phoneB) {
          bump("HIGH", "Same phone");
        }

        const companyA = a.company?.trim().toLowerCase();
        const companyB = b.company?.trim().toLowerCase();
        if (
          companyA &&
          companyB &&
          companyA === companyB &&
          normalizeNameKey(a.firstName, a.lastName) ===
            normalizeNameKey(b.firstName, b.lastName)
        ) {
          bump("MEDIUM", "Same name and company");
        }

        if (
          normalizeNameKey(a.firstName, a.lastName) ===
            normalizeNameKey(b.firstName, b.lastName) &&
          Math.abs(a.createdAt.getTime() - b.createdAt.getTime()) <=
            LOW_CONFIDENCE_WINDOW_MS
        ) {
          bump("LOW", "Same name created within 30 days");
        }
      }
    }

    return { confidence, reasons: [...reasons] };
  }

  for (const visitor of visitors) {
    unionFind.add(visitor.id);
  }

  const emailBuckets = new Map<string, string[]>();
  const phoneBuckets = new Map<string, string[]>();
  const companyBuckets = new Map<string, string[]>();
  const nameBuckets = new Map<string, VisitorRow[]>();

  for (const visitor of visitors) {
    const email = normalizeEmail(visitor.email);
    if (email) {
      const bucket = emailBuckets.get(email) ?? [];
      bucket.push(visitor.id);
      emailBuckets.set(email, bucket);
    }

    const phone = normalizePhoneValue(visitor.phone);
    if (phone) {
      const bucket = phoneBuckets.get(phone) ?? [];
      bucket.push(visitor.id);
      phoneBuckets.set(phone, bucket);
    }

    const company = visitor.company?.trim();
    if (company) {
      const key = `${normalizeNameKey(visitor.firstName, visitor.lastName)}|${company.toLowerCase()}`;
      const bucket = companyBuckets.get(key) ?? [];
      bucket.push(visitor.id);
      companyBuckets.set(key, bucket);
    }

    const nameKey = normalizeNameKey(visitor.firstName, visitor.lastName);
    const bucket = nameBuckets.get(nameKey) ?? [];
    bucket.push(visitor);
    nameBuckets.set(nameKey, bucket);
  }

  applyRules();

  const groups: DuplicateGroup[] = [];

  for (const ids of unionFind.components().values()) {
    if (ids.length < 2) {
      continue;
    }

    const groupVisitors = ids
      .map((id) => visitorMap.get(id))
      .filter((visitor): visitor is VisitorRow => Boolean(visitor));

    const { confidence, reasons } = resolveGroupSignals(groupVisitors);
    const groupKey = buildGroupKey(ids);

    groups.push({
      groupKey,
      confidence,
      reasons,
      visitors: groupVisitors
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((visitor) => ({
          id: visitor.id,
          firstName: visitor.firstName,
          lastName: visitor.lastName,
          email: visitor.email,
          phone: visitor.phone,
          company: visitor.company,
          photoUrl: visitor.photoUrl,
          visitCount: 0,
          lastVisitAt: null,
          createdAt: visitor.createdAt,
        })),
    });
  }

  return groups.sort((left, right) => {
    const confidenceDelta =
      CONFIDENCE_RANK[right.confidence] - CONFIDENCE_RANK[left.confidence];
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    return right.visitors.length - left.visitors.length;
  });
}

export async function getPossibleDuplicates(
  ctx: TenantContext,
  options?: {
    confidence?: DuplicateConfidence;
    limit?: number;
  },
): Promise<DuplicateGroup[]> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const visitors = await prisma.visitor.findMany({
    where: {
      organizationId: ctx.organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      company: true,
      photoUrl: true,
      createdAt: true,
    },
  });

  if (visitors.length < 2) {
    return [];
  }

  const visitStats = await prisma.visit.groupBy({
    by: ["visitorId"],
    where: { organizationId: ctx.organizationId },
    _count: { _all: true },
    _max: {
      createdAt: true,
      checkedInAt: true,
      checkedOutAt: true,
    },
  });

  const statsMap = new Map(
    visitStats.map((row) => [
      row.visitorId,
      {
        visitCount: row._count._all,
        lastVisitAt: resolveLastActivity(
          row._max.createdAt,
          row._max.checkedInAt,
          row._max.checkedOutAt,
        ),
      },
    ]),
  );

  let groups = detectDuplicateGroups(visitors).map((group) => ({
    ...group,
    visitors: group.visitors.map((visitor) => {
      const stats = statsMap.get(visitor.id);
      return {
        ...visitor,
        visitCount: stats?.visitCount ?? 0,
        lastVisitAt: stats?.lastVisitAt ?? null,
      };
    }),
  }));

  if (options?.confidence) {
    groups = groups.filter((group) => group.confidence === options.confidence);
  }

  return groups.slice(0, limit);
}

export async function markDuplicateGroupReviewed(
  ctx: TenantContext,
  input: {
    visitorIds: string[];
    confidence: DuplicateConfidence;
  },
): Promise<void> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visitorIds = [...new Set(input.visitorIds)].sort();
  if (visitorIds.length < 2) {
    return;
  }

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "DUPLICATE_REVIEWED",
    resourceType: "Visitor",
    resourceId: visitorIds[0]!,
    metadata: {
      visitorIds,
      confidence: input.confidence,
      groupKey: buildGroupKey(visitorIds),
    },
  });

  if (input.confidence === "HIGH") {
    emitPlatformNotification({
      kind: "DUPLICATE_DETECTED",
      organizationId: ctx.organizationId,
      confidence: input.confidence,
      visitorIds,
      reason: `High-confidence duplicate visitor group reviewed (${visitorIds.length} profiles).`,
    });
  }
}
