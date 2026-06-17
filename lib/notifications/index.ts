export type {
  NotificationCategory,
  NotificationDomainEvent,
  NotificationEventType,
  NotificationPayload,
  PlatformNotificationEvent,
} from "./types";

export { resolveNotificationCategory, notificationTypesForCategory } from "./categories";
export {
  emitNotification,
  projectVisitStatusNotification,
  projectApprovalReminderNotifications,
} from "./projector";
export { emitPlatformNotification } from "./platform-projector";
export { mapEventToNotifications, mapPlatformEventToNotifications } from "./event-mapper";
export {
  resolvePlatformAdminRecipients,
  resolvePlatformAdminUserIds,
} from "./recipients";
export {
  getNotificationQueue,
  startNotificationEngine,
  enqueueNotificationJobs,
  enqueuePlatformNotificationJobs,
  calculateRetryDelay,
} from "./queue/index";
export type { INotificationQueue, NotificationJobRecord } from "./queue/index";
