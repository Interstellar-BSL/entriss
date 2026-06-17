export type NotificationCategory = "arrivals" | "approvals" | "system";

export type NotificationEventType =
  | "VISITOR_ARRIVED"
  | "APPROVAL_REQUEST"
  | "APPROVAL_REMINDER"
  | "VISIT_APPROVED"
  | "VISIT_REJECTED"
  | "VISIT_CANCELLED"
  | "VISIT_COMPLETED"
  | "SECURITY_OVERRIDE"
  | "ORG_ONBOARDING_REQUESTED"
  | "ORG_APPROVED"
  | "ORG_REJECTED"
  | "ORG_SUSPENDED"
  | "DUPLICATE_DETECTED"
  | "KIOSK_SESSION_FAILED";

/** @deprecated Legacy types stored in DB — mapped via category resolver */
export type LegacyNotificationType =
  | "visit_approval_required"
  | "visit_approved"
  | "visit_rejected";

export type StoredNotificationType =
  | NotificationEventType
  | LegacyNotificationType;

export interface NotificationPayload {
  type: StoredNotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  recipientId: string;
  visitId?: string;
  visitorId?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export type NotificationDomainEvent =
  | {
      kind: "VISITOR_ARRIVED";
      visitId: string;
      visitorId: string;
      branchId: string;
      hostUserId: string;
      visitorName: string;
      forced?: boolean;
    }
  | {
      kind: "APPROVAL_REQUEST";
      visitId: string;
      visitorId: string;
      visitorName: string;
    }
  | {
      kind: "APPROVAL_REMINDER";
      visitId: string;
      visitorId: string;
      visitorName: string;
    }
  | {
      kind: "VISIT_APPROVED";
      visitId: string;
      visitorId: string;
      visitorName: string;
      actorId?: string;
    }
  | {
      kind: "VISIT_REJECTED";
      visitId: string;
      visitorId: string;
      visitorName: string;
      actorId?: string;
      reason?: string;
    }
  | {
      kind: "VISIT_CANCELLED";
      visitId: string;
      visitorId: string;
      visitorName: string;
      actorId?: string;
      reason?: string;
    }
  | {
      kind: "VISIT_COMPLETED";
      visitId: string;
      visitorId: string;
      visitorName: string;
      hostUserId: string;
    }
  | {
      kind: "SECURITY_OVERRIDE";
      visitId: string;
      visitorId: string;
      visitorName: string;
      action: "FORCE_CHECKIN" | "FORCE_CHECKOUT";
      actorId?: string;
    };

export const APPROVAL_REMINDER_THRESHOLD_MS = 15 * 60 * 1000;

/** Platform-wide events (tenant context optional; stored under default org). */
export type PlatformNotificationEvent =
  | {
      kind: "ORG_ONBOARDING_REQUESTED";
      requestId: string;
      organizationName: string;
      contactEmail: string;
      contactPerson: string;
    }
  | {
      kind: "ORG_APPROVED";
      requestId: string;
      organizationId: string;
      organizationName: string;
      contactEmail: string;
    }
  | {
      kind: "ORG_REJECTED";
      requestId: string;
      organizationName: string;
      contactEmail: string;
      reason?: string;
    }
  | {
      kind: "ORG_SUSPENDED";
      organizationId: string;
      organizationName: string;
      reason?: string;
    }
  | {
      kind: "DUPLICATE_DETECTED";
      organizationId: string;
      confidence: "HIGH" | "MEDIUM" | "LOW";
      visitorIds: string[];
      reason: string;
    }
  | {
      kind: "KIOSK_SESSION_FAILED";
      organizationId: string;
      branchId?: string;
      kioskId?: string;
      failureCount: number;
      reason: string;
    };
