import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant/constants";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import { resolveOrganizationConfig } from "@/lib/settings/resolver";

import {
  buildTransactionalEmailsFromEvent,
  shouldSkipReminderEmail,
} from "../email/email.builder";
import {
  buildPlatformAdminAlertEmailJobs,
  buildPlatformEmailJobs,
} from "../platform-email.builder";
import type {
  NotificationDomainEvent,
  NotificationPayload,
  PlatformNotificationEvent,
} from "../types";
import { getNotificationQueue } from "./in-memory-notification-queue";
import { toJobTenantContext } from "./tenant-context";

function buildInAppIdempotencyKey(
  ctx: TenantContext,
  event: NotificationDomainEvent,
  payloads: NotificationPayload[],
) {
  const anchor =
    payloads[0]?.visitId ??
    payloads[0]?.resourceId ??
    payloads[0]?.visitorId ??
    "none";
  const recipients = payloads
    .map((payload) => payload.recipientId)
    .sort()
    .join(",");

  return `in-app:${ctx.organizationId}:${event.kind}:${anchor}:${recipients}`;
}

export async function enqueueNotificationJobs(
  ctx: TenantContext,
  event: NotificationDomainEvent,
  payloads: NotificationPayload[],
) {
  const queue = getNotificationQueue();
  const jobContext = toJobTenantContext(ctx);

  if (payloads.length > 0) {
    await queue.enqueue({
      organizationId: ctx.organizationId,
      eventType: event.kind,
      channelTypes: ["in-app", "webhook"],
      recipients: payloads.map((payload) => payload.recipientId),
      payload: {
        kind: "in-app-batch",
        context: jobContext,
        payloads,
      },
      idempotencyKey: buildInAppIdempotencyKey(ctx, event, payloads),
    });
  }

  const orgConfig = await resolveOrganizationConfig(ctx);
  if (!orgConfig.notifications.emailEnabled) {
    return;
  }

  const emailPayloads = await buildTransactionalEmailsFromEvent(ctx, event);
  for (const email of emailPayloads) {
    if (
      email.type === "APPROVAL_REMINDER" &&
      (await shouldSkipReminderEmail(ctx, email.visit.id, email.to))
    ) {
      continue;
    }

    await queue.enqueue({
      organizationId: ctx.organizationId,
      eventType: event.kind,
      channelTypes: ["email"],
      recipients: [email.to],
      payload: {
        kind: "transactional-email",
        context: jobContext,
        email,
      },
      idempotencyKey: email.idempotencyKey,
    });
  }

  const platformEmails = await buildPlatformAdminAlertEmailJobs(ctx, event);
  for (const email of platformEmails) {
    await queue.enqueue({
      organizationId: DEFAULT_ORGANIZATION_ID,
      eventType: event.kind,
      channelTypes: ["email"],
      recipients: [email.to],
      payload: {
        kind: "platform-email",
        context: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          organizationName: "Platform",
        },
        email,
      },
      idempotencyKey: email.idempotencyKey,
    });
  }
}

export async function enqueuePlatformNotificationJobs(
  ctx: TenantContext,
  event: PlatformNotificationEvent,
  payloads: NotificationPayload[],
) {
  const queue = getNotificationQueue();
  const jobContext = toJobTenantContext(ctx);

  if (payloads.length > 0) {
    const anchor =
      payloads[0]?.resourceId ?? payloads[0]?.visitorId ?? event.kind;
    const recipients = payloads
      .map((payload) => payload.recipientId)
      .sort()
      .join(",");

    await queue.enqueue({
      organizationId: ctx.organizationId,
      eventType: event.kind,
      channelTypes: ["in-app", "webhook"],
      recipients: payloads.map((payload) => payload.recipientId),
      payload: {
        kind: "in-app-batch",
        context: jobContext,
        payloads,
      },
      idempotencyKey: `in-app:${ctx.organizationId}:${event.kind}:${anchor}:${recipients}`,
    });
  }

  const platformEmails = await buildPlatformEmailJobs(event);
  for (const email of platformEmails) {
    await queue.enqueue({
      organizationId: DEFAULT_ORGANIZATION_ID,
      eventType: event.kind,
      channelTypes: ["email"],
      recipients: [email.to],
      payload: {
        kind: "platform-email",
        context: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          organizationName: "Platform",
        },
        email,
      },
      idempotencyKey: email.idempotencyKey,
    });
  }
}
