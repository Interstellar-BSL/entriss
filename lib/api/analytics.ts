import { apiFetch } from "@/lib/api/client";
import type { AnalyticsPeriod } from "@/lib/analytics/date-ranges";

export interface AnalyticsQueryParams {
  period?: AnalyticsPeriod;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  hostId?: string;
  category?: string;
}

export interface AnalyticsDashboardData {
  range: {
    period: AnalyticsPeriod;
    from: string;
    to: string;
    label: string;
  };
  kpis: {
    daily: number;
    weekly: number;
    monthly: number;
    totalInRange: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    noShows: number;
  };
  statusBreakdown: {
    total: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    noShows: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  trend: Array<{
    date: string;
    total: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    noShows: number;
  }>;
  generatedAt: string;
}

export interface BranchAnalyticsData {
  range: AnalyticsDashboardData["range"];
  branches: Array<{
    branchId: string;
    branchName: string;
    totalVisits: number;
    checkIns: number;
    completedVisits: number;
    completionRate: number;
    firstTimeVisitors: number;
    returningVisitors: number;
  }>;
  hourlyHeatmap: Array<{
    branchId: string;
    branchName: string;
    hour: number;
    count: number;
  }>;
  trends: Array<{
    date: string;
    branchId: string;
    branchName: string;
    visits: number;
  }>;
  peakDays: Array<{
    branchId: string;
    branchName: string;
    date: string;
    visits: number;
  }>;
  generatedAt: string;
}

export interface HostAnalyticsData {
  range: AnalyticsDashboardData["range"];
  hosts: Array<{
    hostId: string;
    hostName: string;
    totalVisits: number;
    completedVisits: number;
    pendingVisits: number;
    checkedInVisits: number;
    averageDurationMinutes: number | null;
  }>;
  selectedHost: HostAnalyticsData["hosts"][number] | null;
  generatedAt: string;
}

export interface AuditAnalyticsData {
  range: AnalyticsDashboardData["range"];
  visitsByStatus: Array<{ status: string; count: number }>;
  missingCheckouts: Array<{
    visitId: string;
    visitorName: string;
    branchName: string;
    status: string;
    scheduledAt: string | null;
    checkedInAt: string | null;
    issue: string;
  }>;
  approvalDelays: AuditAnalyticsData["missingCheckouts"];
  overrideUsage: Array<{ action: string; count: number }>;
  suspiciousPatterns: Array<{
    visitorId: string;
    visitorName: string;
    date: string;
    visitCount: number;
  }>;
  activity: {
    items: Array<{
      id: string;
      description: string;
      category: string;
      occurredAt: string;
      action: string;
    }>;
  };
  generatedAt: string;
}

export interface AnalyticsExportData {
  range: AnalyticsDashboardData["range"];
  overview: AnalyticsDashboardData;
  branches: BranchAnalyticsData;
  hosts: HostAnalyticsData;
  audit: AuditAnalyticsData;
  visits: Array<{
    visitId: string;
    visitorId: string;
    branchName: string;
    hostName: string;
    status: string;
    scheduledAt: string | null;
    checkedInAt: string | null;
    checkedOutAt: string | null;
    createdAt: string;
  }>;
  generatedAt: string;
}

function withStringDates<T extends { generatedAt: string | Date }>(data: T): T {
  return {
    ...data,
    generatedAt: String(data.generatedAt),
  };
}

export async function getAnalyticsDashboard(params?: AnalyticsQueryParams) {
  return apiFetch<AnalyticsDashboardData>("/api/v1/analytics/dashboard", {
    searchParams: params,
  });
}

export async function getBranchAnalytics(params?: AnalyticsQueryParams) {
  return apiFetch<BranchAnalyticsData>("/api/v1/analytics/branches", {
    searchParams: params,
  });
}

export async function getHostAnalytics(params?: AnalyticsQueryParams) {
  return apiFetch<HostAnalyticsData>("/api/v1/analytics/hosts", {
    searchParams: params,
  });
}

export async function getAuditAnalytics(params?: AnalyticsQueryParams) {
  return apiFetch<AuditAnalyticsData>("/api/v1/analytics/audit", {
    searchParams: params,
  });
}

export async function getAnalyticsExportData(params?: AnalyticsQueryParams) {
  const data = await apiFetch<AnalyticsExportData>("/api/v1/analytics/export", {
    searchParams: params,
  });
  return withStringDates(data);
}
