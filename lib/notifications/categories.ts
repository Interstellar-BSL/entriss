import type {
  NotificationCategory,
  NotificationEventType,
  PlatformNotificationEvent,
} from "./types";

const TYPE_CATEGORY: Record<string, NotificationCategory> = {
  VISITOR_ARRIVED: "arrivals",
  APPROVAL_REQUEST: "approvals",
  APPROVAL_REMINDER: "approvals",
  VISIT_APPROVED: "approvals",
  VISIT_REJECTED: "approvals",
  VISIT_CANCELLED: "approvals",
  VISIT_COMPLETED: "arrivals",
  SECURITY_OVERRIDE: "system",
  ORG_ONBOARDING_REQUESTED: "system",
  ORG_APPROVED: "system",
  ORG_REJECTED: "system",
  ORG_SUSPENDED: "system",
  DUPLICATE_DETECTED: "system",
  KIOSK_SESSION_FAILED: "system",
  visit_approval_required: "approvals",
  visit_approved: "approvals",
  visit_rejected: "approvals",
};

export function resolveNotificationCategory(type: string): NotificationCategory {
  return TYPE_CATEGORY[type] ?? "system";
}

export function notificationTypesForCategory(
  category: NotificationCategory,
): NotificationEventType[] {
  return (
    Object.entries(TYPE_CATEGORY) as Array<[NotificationEventType, NotificationCategory]>
  )
    .filter(([, value]) => value === category)
    .map(([key]) => key);
}

export function isNotificationEventType(
  type: string,
): type is NotificationEventType {
  return type in TYPE_CATEGORY && type === type.toUpperCase();
}

export function platformEventCategory(
  event: PlatformNotificationEvent,
): NotificationCategory {
  return "system";
}
