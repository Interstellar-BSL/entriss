import type { NotificationPayload } from "../types";

export interface NotificationChannelMessage {
  type: string;
  title: string;
  message: string;
  recipientId: string;
  visitId?: string;
  visitorId?: string;
  metadata?: Record<string, unknown>;
}

export interface INotificationChannel {
  readonly name: string;
  deliver(message: NotificationChannelMessage): Promise<void>;
}

export function toChannelMessage(
  payload: NotificationPayload,
): NotificationChannelMessage {
  return {
    type: payload.type,
    title: payload.title,
    message: payload.message,
    recipientId: payload.recipientId,
    visitId: payload.visitId,
    visitorId: payload.visitorId,
    metadata: payload.metadata,
  };
}
