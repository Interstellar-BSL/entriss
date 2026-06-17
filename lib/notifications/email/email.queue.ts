import { getNotificationQueue } from "../queue/in-memory-notification-queue";
import { deliverTransactionalEmailFromWorker } from "../worker/email-delivery";
import type { TransactionalEmailPayload } from "./email.types";
import type { TenantContext } from "@/lib/tenant/tenant-context";

/**
 * @deprecated Use notification worker queue. Kept for direct test hooks only.
 */
export function enqueueTransactionalEmail(
  ctx: TenantContext,
  payload: TransactionalEmailPayload,
) {
  const queue = getNotificationQueue();
  void queue.enqueue({
    organizationId: ctx.organizationId,
    eventType: payload.type,
    channelTypes: ["email"],
    recipients: [payload.to],
    payload: {
      kind: "transactional-email",
      context: {
        organizationId: ctx.organizationId,
        organizationName: ctx.activeOrganization.name,
      },
      email: payload,
    },
    idempotencyKey: payload.idempotencyKey,
  });
}

export function enqueueEmail(
  ctx: TenantContext,
  payload: TransactionalEmailPayload,
) {
  enqueueTransactionalEmail(ctx, payload);
}

export async function deliverTransactionalEmailDirect(
  ctx: TenantContext,
  payload: TransactionalEmailPayload,
) {
  return deliverTransactionalEmailFromWorker(ctx, payload, 0);
}
