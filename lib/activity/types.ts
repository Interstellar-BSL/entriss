export type ActivitySource = "visit" | "audit";

export type ActivityCategory =
  | "visit"
  | "approval"
  | "identity"
  | "settings"
  | "security"
  | "system";

export type ActivityItem = {
  id: string;
  source: ActivitySource;
  occurredAt: Date;
  actorId?: string;
  actorName?: string;
  visitorId?: string;
  visitorName?: string;
  visitId?: string;
  action: string;
  category: ActivityCategory;
  description: string;
  metadata?: Record<string, unknown>;
};

export type ActivityStreamFilters = {
  organizationId: string;
  visitorId?: string;
  visitId?: string;
  actorId?: string;
  category?: ActivityCategory;
  branchId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

export type ActivityStreamResult = {
  items: ActivityItem[];
};
