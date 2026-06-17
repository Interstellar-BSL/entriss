import { getVisit, listVisits } from "@/lib/api/visits";
import { resolveHostDisplayNameFromVisit } from "@/lib/hosts/display";
import { buildVisitAuditTrail } from "@/lib/visits/audit-events";
import type { VisitTimelineEntry } from "@/lib/visits/types";

export const LIVE_ACTIVITY_REFRESH_MS = 15_000;
export const LIVE_ACTIVITY_DETAIL_FETCH_LIMIT = 8;
export const LIVE_ACTIVITY_FEED_LIMIT = 25;

export interface LiveActivityFeedEntry {
  id: string;
  visitId: string;
  visitorName: string;
  branchName: string;
  hostName: string;
  label: string;
  kind: VisitTimelineEntry["kind"];
  timestamp: string;
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
}

function visitRecencyTimestamp(visit: {
  checkedInAt?: Date | string | null;
  checkedOutAt?: Date | string | null;
  scheduledAt?: Date | string | null;
}) {
  const candidates = [
    visit.checkedOutAt,
    visit.checkedInAt,
    visit.scheduledAt,
  ].filter(Boolean);

  if (candidates.length === 0) {
    return 0;
  }

  return Math.max(...candidates.map((value) => new Date(value!).getTime()));
}

export async function fetchLiveActivityFeed(): Promise<LiveActivityFeedEntry[]> {
  const todayRange = getTodayRange();
  const list = await listVisits({ ...todayRange, limit: 20 });

  const visitIds = [...list.items]
    .sort((a, b) => visitRecencyTimestamp(b) - visitRecencyTimestamp(a))
    .slice(0, LIVE_ACTIVITY_DETAIL_FETCH_LIMIT)
    .map((visit) => visit.id);

  const details = await Promise.all(
    visitIds.map(async (id) => {
      try {
        return await getVisit(id);
      } catch {
        return null;
      }
    }),
  );

  const entries: LiveActivityFeedEntry[] = [];

  for (const detail of details) {
    if (!detail) {
      continue;
    }

    const visitorName = `${detail.visitor.firstName} ${detail.visitor.lastName}`.trim();
    const branchName = detail.branch.name;
    const hostName = resolveHostDisplayNameFromVisit(detail);

    for (const event of buildVisitAuditTrail(detail.events ?? [])) {
      if (!event.timestamp) {
        continue;
      }

      entries.push({
        id: `${detail.id}-${event.id}`,
        visitId: detail.id,
        visitorName,
        branchName,
        hostName,
        label: event.label,
        kind: event.kind,
        timestamp: event.timestamp,
      });
    }
  }

  return entries
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, LIVE_ACTIVITY_FEED_LIMIT);
}
