import { prisma } from "@/lib/db/client";
import type { NormalizedAnalyticsFilters } from "@/lib/analytics/query/filters";

import {
  deserializeSnapshotData,
  isSnapshotEligible,
  isSnapshotFresh,
} from "./snapshot-mappers";
import type {
  AnalyticsQueryType,
  AnalyticsSnapshotPeriod,
} from "./snapshot-types";

export async function readAnalyticsSnapshot(
  organizationId: string,
  type: AnalyticsQueryType,
  normalized: NormalizedAnalyticsFilters,
) {
  if (!isSnapshotEligible(normalized)) {
    return null;
  }

  const period = normalized.range.period as AnalyticsSnapshotPeriod;

  try {
    const snapshot = await prisma.analyticsSnapshot.findUnique({
      where: {
        organizationId_type_period_periodStart: {
          organizationId,
          type,
          period,
          periodStart: normalized.range.from,
        },
      },
    });

    if (!snapshot) {
      return null;
    }

    const { SNAPSHOT_TTL_MS: ttlMs } = await import("./snapshot-types");

    if (!isSnapshotFresh(snapshot.updatedAt, period, ttlMs)) {
      return null;
    }

    return deserializeSnapshotData(type, snapshot.data);
  } catch {
    return null;
  }
}
