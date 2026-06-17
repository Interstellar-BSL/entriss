import type { WebhookNotificationPayload } from "../queue/job-types";

/**
 * Future-proof webhook fanout placeholder.
 * External HTTP delivery will be implemented in a later phase.
 */
export async function deliverWebhookNotification(
  payload: WebhookNotificationPayload,
): Promise<void> {
  if (process.env.NOTIFICATION_WEBHOOK_ENABLED === "true") {
    console.info("[notification:webhook] placeholder — delivery disabled", {
      eventType: payload.eventType,
      orgId: payload.orgId,
      timestamp: payload.timestamp,
    });
    return;
  }

  console.debug("[notification:webhook] skipped", {
    eventType: payload.eventType,
    orgId: payload.orgId,
  });
}
