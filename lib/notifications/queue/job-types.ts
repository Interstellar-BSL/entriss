import type { TransactionalEmailPayload } from "../email/email.types";
import type { PlatformEmailJob } from "../platform-email.builder";
import type { NotificationPayload } from "../types";

export type NotificationChannelType = "in-app" | "email" | "webhook";

export type NotificationJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "RETRYING"
  | "FAILED"
  | "DELIVERED";

export type InAppDeliveryStatus = "PENDING" | "SENT" | "FAILED";

export interface JobTenantContext {
  organizationId: string;
  organizationName: string;
}

export type NotificationJobPayload =
  | {
      kind: "in-app-batch";
      context: JobTenantContext;
      payloads: NotificationPayload[];
    }
  | {
      kind: "transactional-email";
      context: JobTenantContext;
      email: TransactionalEmailPayload;
    }
  | {
      kind: "platform-email";
      context: JobTenantContext;
      email: PlatformEmailJob;
    }
  | {
      kind: "webhook";
      eventType: string;
      orgId: string;
      payload: Record<string, unknown>;
      timestamp: string;
    };

export interface CreateNotificationJobInput {
  organizationId: string;
  eventType: string;
  channelTypes: NotificationChannelType[];
  recipients: string[];
  payload: NotificationJobPayload;
  idempotencyKey: string;
  maxRetries?: number;
}

export interface NotificationJobRecord {
  id: string;
  organizationId: string;
  eventType: string;
  channelTypes: NotificationChannelType[];
  recipients: string[];
  payload: NotificationJobPayload;
  status: NotificationJobStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;
  lastError: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookNotificationPayload {
  eventType: string;
  orgId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}
