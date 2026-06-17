import { prisma } from "@/lib/db/client";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import type { NotificationPayload } from "../types";

export interface DeliveryResult {
  success: boolean;
  error?: string;
}

export async function deliverInAppBatchFromWorker(
  ctx: TenantContext,
  payloads: NotificationPayload[],
  jobIdempotencyKey: string,
  jobRetryCount: number,
): Promise<DeliveryResult> {
  if (payloads.length === 0) {
    return { success: true };
  }

  try {
    const rows = payloads.map((payload) => ({
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
      deliveryStatus: "SENT" as const,
      channelUsed: "in-app",
      providerResponse: "queued-worker",
      retryCount: jobRetryCount,
      deliveryKey: `${jobIdempotencyKey}:${payload.recipientId}`,
    }));

    await prisma.appNotification.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    for (const payload of payloads) {
      try {
        await prisma.appNotification.create({
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
            deliveryStatus: "FAILED",
            channelUsed: "in-app",
            providerResponse: message,
            retryCount: jobRetryCount,
            deliveryKey: `${jobIdempotencyKey}:${payload.recipientId}`,
          },
        });
      } catch {
        // duplicate deliveryKey on retry — treat as already delivered
      }
    }

    return { success: false, error: message };
  }
}
