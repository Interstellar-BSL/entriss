import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant/constants";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { mapPlatformEventToNotifications } from "./event-mapper";
import { enqueuePlatformNotificationJobs } from "./queue/producer";
import { enqueueNotificationJob } from "./async-job-runner";
import type { PlatformNotificationEvent } from "./types";
function buildPlatformTenantContext(
  organizationId = DEFAULT_ORGANIZATION_ID,
): TenantContext {
  return {
    organizationId,
    userId: "platform-notification-system",
    email: "notifications@entriss.local",
    systemRole: "SYSTEM_OWNER",
    activeOrganization: {
      id: organizationId,
      name: "Platform",
      slug: "default",
    },
    role: null,
    memberId: null,
    roleId: null,
    permissions: [],
    isSystemOwner: true,
  };
}

export function emitPlatformNotification(event: PlatformNotificationEvent) {
  enqueueNotificationJob(async () => {
    const ctx = buildPlatformTenantContext(DEFAULT_ORGANIZATION_ID);
    const payloads = await mapPlatformEventToNotifications(event);
    await enqueuePlatformNotificationJobs(ctx, event, payloads);
  });
}