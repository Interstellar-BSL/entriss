import { apiFetch } from "@/lib/api/client";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import type { ApprovalQueueTab } from "@/lib/services/approval.service";
import { detachVisitWithRelations, detachVisits } from "@/lib/visits/detach";

export type { ApprovalQueueTab };

export interface ApprovalQueueVisitItem {
  visit: VisitWithRelations;
}

export interface ApprovalQueueHistoryItem {
  approval: {
    id: string;
    decision: string | null;
    notes: string | null;
    decidedAt: string | null;
    approver: {
      id: string;
      user: { id: string; name: string | null; email: string };
    };
  };
  visit: VisitWithRelations;
}

export interface ApprovalQueueResponse {
  items: VisitWithRelations[] | ApprovalQueueHistoryItem[];
  total: number;
}

export async function listApprovalQueue(
  tab: ApprovalQueueTab,
  params?: { limit?: number; offset?: number },
) {
  const data = await apiFetch<ApprovalQueueResponse>("/api/v1/approvals", {
    searchParams: { tab, ...params },
  });

  if (tab === "approved" || tab === "rejected") {
    return {
      ...data,
      items: (data.items as ApprovalQueueHistoryItem[]).map((item) => ({
        ...item,
        visit: detachVisitWithRelations(item.visit),
      })),
    };
  }

  return {
    ...data,
    items: detachVisits(data.items as VisitWithRelations[]),
  };
}

export async function approveVisit(visitId: string, notes?: string) {
  const data = await apiFetch<{ visit: VisitWithRelations }>(
    `/api/v1/visits/${visitId}/approve-pre-visit`,
    {
      method: "POST",
      body: JSON.stringify({ notes }),
    },
  );
  return { visit: detachVisitWithRelations(data.visit) };
}

export async function rejectVisit(visitId: string, notes?: string) {
  const data = await apiFetch<{ visit: VisitWithRelations }>(
    `/api/v1/visits/${visitId}/reject-pre-visit`,
    {
      method: "POST",
      body: JSON.stringify({ notes }),
    },
  );
  return { visit: detachVisitWithRelations(data.visit) };
}
