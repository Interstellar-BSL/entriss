import { prisma } from "@/lib/db/client";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import {
  deliverToExternalChannels,
} from "./channels";
import { toChannelMessage } from "./channels/channel.types";
import type { NotificationPayload } from "./types";

export async function persistInAppNotification(
  ctx: TenantContext,
  payload: NotificationPayload,
) {
  return prisma.appNotification.create({
    data: {
      organizationId: ctx.organizationId,
      userId: payload.recipientId,
      type: payload.type,
      category: payload.category,
      title: payload.title,
      body: payload.message,
      resourceType:
        payload.resourceType ??
        (payload.visitId ? "Visit" : payload.visitorId ? "Visitor" : null),
      resourceId:
        payload.resourceId ?? payload.visitId ?? payload.visitorId ?? null,
    },
  });
}

export async function deliverNotification(
  ctx: TenantContext,
  payload: NotificationPayload,
) {
  await persistInAppNotification(ctx, payload);
  await deliverToExternalChannels(toChannelMessage(payload));
}

export async function deliverNotificationBatch(
  ctx: TenantContext,
  payloads: NotificationPayload[],
) {
  if (payloads.length === 0) {
    return;
  }

  await prisma.appNotification.createMany({
    data: payloads.map((payload) => ({
      organizationId: ctx.organizationId,
      userId: payload.recipientId,
      type: payload.type,
      category: payload.category,
      title: payload.title,
      body: payload.message,
      resourceType:
        payload.resourceType ??
        (payload.visitId ? "Visit" : payload.visitorId ? "Visitor" : null),
      resourceId:
        payload.resourceId ?? payload.visitId ?? payload.visitorId ?? null,
    })),
  });

  await Promise.allSettled(
    payloads.map((payload) =>
      deliverToExternalChannels(toChannelMessage(payload)),
    ),
  );
}
