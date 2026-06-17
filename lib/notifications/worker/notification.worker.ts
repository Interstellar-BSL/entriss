import { deliverWebhookNotification } from "../channels/webhook.channel";
import type { NotificationJobRecord } from "../queue/job-types";
import { fromJobTenantContext } from "../queue/tenant-context";
import { deliverInAppBatchFromWorker } from "./in-app-delivery";
import {
  deliverPlatformEmailFromWorker,
  deliverTransactionalEmailFromWorker,
} from "./email-delivery";

export async function processNotificationJob(job: NotificationJobRecord) {
  const payload = job.payload;

  switch (payload.kind) {
    case "in-app-batch": {
      const ctx = fromJobTenantContext(payload.context);
      const result = await deliverInAppBatchFromWorker(
        ctx,
        payload.payloads,
        job.idempotencyKey,
        job.retryCount,
      );

      if (!result.success) {
        throw new Error(result.error ?? "In-app delivery failed");
      }

      if (job.channelTypes.includes("webhook")) {
        await deliverWebhookNotification({
          eventType: job.eventType,
          orgId: ctx.organizationId,
          payload: {
            recipients: job.recipients,
            notifications: payload.payloads,
          },
          timestamp: new Date().toISOString(),
        });
      }
      return;
    }

    case "transactional-email": {
      const ctx = fromJobTenantContext(payload.context);
      const result = await deliverTransactionalEmailFromWorker(
        ctx,
        payload.email,
        job.retryCount,
      );

      if (!result.success) {
        throw new Error(result.error ?? "Transactional email delivery failed");
      }
      return;
    }

    case "platform-email": {
      const ctx = fromJobTenantContext(payload.context);
      const result = await deliverPlatformEmailFromWorker(
        ctx,
        payload.email,
        job.retryCount,
      );

      if (!result.success) {
        throw new Error(result.error ?? "Platform email delivery failed");
      }
      return;
    }

    case "webhook": {
      await deliverWebhookNotification(payload);
      return;
    }

    default: {
      const exhaustive: never = payload;
      throw new Error(`Unsupported notification job payload: ${String(exhaustive)}`);
    }
  }
}
