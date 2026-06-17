export type AnalyticsSnapshotType = "dashboard" | "branch" | "host" | "audit";

export type AnalyticsSnapshotPeriod = "daily" | "weekly" | "monthly";

export type AnalyticsQueryType = AnalyticsSnapshotType;

export const SNAPSHOT_TYPES: AnalyticsSnapshotType[] = [
  "dashboard",
  "branch",
  "host",
  "audit",
];

export const SNAPSHOT_PERIODS: AnalyticsSnapshotPeriod[] = [
  "daily",
  "weekly",
  "monthly",
];

export const SNAPSHOT_TTL_MS: Record<AnalyticsSnapshotPeriod, number> = {
  daily: 60 * 60 * 1000,
  weekly: 6 * 60 * 60 * 1000,
  monthly: 12 * 60 * 60 * 1000,
};

export interface AnalyticsSnapshotRecord {
  id: string;
  organizationId: string;
  type: AnalyticsSnapshotType;
  period: AnalyticsSnapshotPeriod;
  periodStart: Date;
  periodEnd: Date;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}
