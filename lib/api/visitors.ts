import { apiFetch, type PaginatedResult } from "@/lib/api/client";
import { detachVisitorRecord, detachVisitorRecords } from "@/lib/visits/detach";
import type {
  CreateVisitorRequestInput,
  ResolveVisitorIdentityInput,
} from "@/lib/validations/visitor";
import type { VisitStatus } from "@prisma/client";
import type { VisitorTag } from "@/lib/visitors/tags";

export interface VisitorRecord {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  photoUrl: string | null;
  notes: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListVisitorsParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export type CreateVisitorInput = Omit<CreateVisitorRequestInput, "forceCreateVisitor">;

export interface CreateVisitorResponse {
  visitor: VisitorRecord;
  created: boolean;
}

export interface ResolveVisitorIdentityResponse {
  visitor: VisitorRecord | null;
  visitSummary: VisitorVisitStats | null;
}

export interface VisitorVisitStats {
  visitCount: number;
  lastVisitAt: string | null;
}

export interface VisitorTimelineVisitor {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface VisitorTimelineMetrics {
  totalVisits: number;
  completedVisits: number;
  cancelledVisits: number;
  noShows: number;
  currentlyCheckedIn: number;
  averageVisitDurationMinutes: number | null;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
}

export interface VisitorTimelineEntry {
  visitId: string;
  title: string;
  branchName: string;
  hostName: string;
  scheduledStart: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  durationMinutes: number | null;
  status: VisitStatus;
  createdAt: string;
  forcedCheckIn: boolean;
  forcedCheckOut: boolean;
}

export interface VisitorTimelineData {
  visitor: VisitorTimelineVisitor;
  metrics: VisitorTimelineMetrics;
  timeline: VisitorTimelineEntry[];
}

export type VisitorType =
  | "FIRST_TIME"
  | "RETURNING"
  | "FREQUENT"
  | "VIP"
  | "DORMANT";

export type VisitFrequency = "LOW" | "MEDIUM" | "HIGH";

export interface VisitorInsightsFavoriteBranch {
  id: string;
  name: string;
  visitCount: number;
}

export interface VisitorInsightsFavoriteHost {
  id: string;
  name: string;
  visitCount: number;
}

export interface VisitorInsightsMostRecentHost {
  id: string;
  name: string;
}

export interface VisitorInsightsMostRecentBranch {
  id: string;
  name: string;
}

export interface VisitorInsightsLastVisit {
  visitId: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  durationMinutes: number | null;
  host: VisitorInsightsMostRecentHost;
  branch: VisitorInsightsMostRecentBranch;
  occurredAt: string;
}

export interface VisitorInsightsData {
  visitCount: number;
  completedVisitCount: number;
  cancelledVisitCount: number;
  noShowCount: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  averageVisitDurationMinutes: number | null;
  favoriteBranch: VisitorInsightsFavoriteBranch | null;
  favoriteHost: VisitorInsightsFavoriteHost | null;
  mostRecentHost: VisitorInsightsMostRecentHost | null;
  mostRecentBranch: VisitorInsightsMostRecentBranch | null;
  lastVisit: VisitorInsightsLastVisit | null;
  daysSinceLastVisit: number | null;
  visitorType: VisitorType;
  visitFrequency: VisitFrequency;
}

export interface VisitorInsightsResult {
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  insights: VisitorInsightsData;
}

export interface VisitorNoteRecord {
  id: string;
  visitorId: string;
  note: string;
  createdById: string;
  createdByName: string;
  updatedById: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorTagsData {
  visitorId: string;
  tags: VisitorTag[];
}

export async function listVisitors(params?: ListVisitorsParams) {
  const data = await apiFetch<PaginatedResult<VisitorRecord>>(
    "/api/v1/visitors",
    {
      searchParams: params,
    },
  );

  return {
    ...data,
    items: detachVisitorRecords(data.items),
  };
}

export async function getVisitorTimeline(visitorId: string) {
  return apiFetch<VisitorTimelineData>(
    `/api/v1/visitors/${visitorId}/timeline`,
  );
}

export async function getVisitorInsights(visitorId: string) {
  return apiFetch<VisitorInsightsResult>(
    `/api/v1/visitors/${visitorId}/insights`,
  );
}

export async function listVisitorNotes(visitorId: string) {
  const data = await apiFetch<{ items: VisitorNoteRecord[] }>(
    `/api/v1/visitors/${visitorId}/notes`,
  );

  return data.items;
}

export async function createVisitorNote(visitorId: string, note: string) {
  return apiFetch<VisitorNoteRecord>(`/api/v1/visitors/${visitorId}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function updateVisitorNote(
  visitorId: string,
  noteId: string,
  note: string,
) {
  return apiFetch<VisitorNoteRecord>(
    `/api/v1/visitors/${visitorId}/notes/${noteId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ note }),
    },
  );
}

export async function deleteVisitorNote(visitorId: string, noteId: string) {
  return apiFetch<{ deleted: true }>(
    `/api/v1/visitors/${visitorId}/notes/${noteId}`,
    {
      method: "DELETE",
    },
  );
}

export async function getVisitorTags(visitorId: string) {
  return apiFetch<VisitorTagsData>(`/api/v1/visitors/${visitorId}/tags`);
}

export async function updateVisitorTags(visitorId: string, tags: VisitorTag[]) {
  return apiFetch<VisitorTagsData>(`/api/v1/visitors/${visitorId}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tags }),
  });
}

export async function resolveVisitorIdentity(input: ResolveVisitorIdentityInput) {
  const data = await apiFetch<ResolveVisitorIdentityResponse>(
    "/api/v1/visitors/resolve",
    {
      searchParams: {
        email: input.email,
        phone: input.phone,
      },
    },
  );

  return {
    visitor: data.visitor ? detachVisitorRecord(data.visitor) : null,
    visitSummary: data.visitSummary,
  };
}

export async function createVisitor(input: CreateVisitorRequestInput) {
  const data = await apiFetch<CreateVisitorResponse>("/api/v1/visitors", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return {
    ...data,
    visitor: detachVisitorRecord(data.visitor),
  };
}

export async function fetchVisitorVisitStats(
  visitorId: string,
): Promise<VisitorVisitStats> {
  const { listVisits } = await import("@/lib/api/visits");
  const result = await listVisits({ visitorId, limit: 1 });

  const lastVisitAt =
    result.items[0]?.checkedInAt ??
    result.items[0]?.scheduledAt ??
    null;

  return {
    visitCount: result.pagination.total,
    lastVisitAt: lastVisitAt ? String(lastVisitAt) : null,
  };
}

export async function enrichVisitorsWithVisitStats(
  visitors: VisitorRecord[],
): Promise<Map<string, VisitorVisitStats>> {
  const stats = new Map<string, VisitorVisitStats>();

  await Promise.all(
    visitors.map(async (visitor) => {
      try {
        const visitorStats = await fetchVisitorVisitStats(visitor.id);
        stats.set(visitor.id, visitorStats);
      } catch {
        stats.set(visitor.id, { visitCount: 0, lastVisitAt: null });
      }
    }),
  );

  return stats;
}
