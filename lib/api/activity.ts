import { apiFetch } from "@/lib/api/client";
import type {
  ActivityCategory,
  ActivityItem as ActivityItemBase,
} from "@/lib/activity/types";

export type ActivityItem = Omit<ActivityItemBase, "occurredAt"> & {
  occurredAt: string;
};

export type ActivityStreamResult = {
  items: ActivityItem[];
};

export type { ActivityCategory };

export interface ListActivityParams {
  visitorId?: string;
  visitId?: string;
  actorId?: string;
  category?: ActivityCategory;
  branchId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function listActivity(params?: ListActivityParams) {
  return apiFetch<ActivityStreamResult>("/api/v1/activity", {
    searchParams: params,
  });
}
