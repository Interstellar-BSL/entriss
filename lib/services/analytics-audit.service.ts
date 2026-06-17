import { queryAnalytics } from "@/lib/analytics/query/analytics-query.service";
import type { AnalyticsPeriod } from "@/lib/analytics/date-ranges";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import type { VisitStatus } from "@/app/generated/prisma/enums";

import type { getActivityStream } from "./activity-stream.service";

export interface AuditAnalyticsFilters {
  period?: AnalyticsPeriod;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  category?: string;
}

export interface AuditComplianceRow {
  visitId: string;
  visitorName: string;
  branchName: string;
  status: VisitStatus;
  scheduledAt: string | null;
  checkedInAt: string | null;
  issue: string;
}

export interface AuditSecurityOverrideRow {
  action: string;
  count: number;
}

export interface AuditSuspiciousPatternRow {
  visitorId: string;
  visitorName: string;
  date: string;
  visitCount: number;
}

export interface AuditAnalyticsResult {
  range: {
    period: AnalyticsPeriod;
    from: string;
    to: string;
    label: string;
  };
  visitsByStatus: Array<{ status: VisitStatus; count: number }>;
  missingCheckouts: AuditComplianceRow[];
  approvalDelays: AuditComplianceRow[];
  overrideUsage: AuditSecurityOverrideRow[];
  suspiciousPatterns: AuditSuspiciousPatternRow[];
  activity: Awaited<ReturnType<typeof getActivityStream>>;
  generatedAt: string;
}

export async function getAuditAnalytics(
  ctx: TenantContext,
  filters: AuditAnalyticsFilters = {},
): Promise<AuditAnalyticsResult> {
  return queryAnalytics({
    type: "audit",
    filters,
    ctx,
  });
}
