import { prisma } from "@/lib/db/client";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import {
  resolveApproverUserIds,
  resolveBranchAdminUserIds,
  resolveOrgAdminUserIds,
  resolvePlatformAdminUserIds,
  resolveSecurityUserIds,
  uniqueRecipientIds,
} from "./recipients";
import type {
  NotificationDomainEvent,
  NotificationPayload,
  PlatformNotificationEvent,
} from "./types";

function payloadForRecipients(
  recipients: string[],
  base: Omit<NotificationPayload, "recipientId">,
): NotificationPayload[] {
  return recipients.map((recipientId) => ({
    ...base,
    recipientId,
  }));
}

async function loadVisitRouting(ctx: TenantContext, visitId: string) {
  return prisma.visit.findFirst({
    where: { id: visitId, organizationId: ctx.organizationId },
    select: {
      branchId: true,
      hostMemberId: true,
      host: { select: { userId: true } },
    },
  });
}

export async function mapEventToNotifications(
  ctx: TenantContext,
  event: NotificationDomainEvent,
): Promise<NotificationPayload[]> {
  switch (event.kind) {
    case "VISITOR_ARRIVED": {
      const branchAdmins = await resolveBranchAdminUserIds(ctx, event.branchId);
      const orgAdmins = event.forced
        ? await resolveOrgAdminUserIds(ctx)
        : [];
      const platformAdmins = event.forced
        ? await resolvePlatformAdminUserIds()
        : [];
      const recipients = uniqueRecipientIds([
        event.hostUserId,
        ...branchAdmins,
        ...orgAdmins,
        ...platformAdmins,
      ]);

      return payloadForRecipients(recipients, {
        type: "VISITOR_ARRIVED",
        category: "arrivals",
        title: event.forced ? "Visitor force checked in" : "Visitor arrived",
        message: `${event.visitorName} has checked in.`,
        visitId: event.visitId,
        visitorId: event.visitorId,
        resourceType: "Visit",
        resourceId: event.visitId,
        metadata: { forced: event.forced ?? false },
      });
    }

    case "APPROVAL_REQUEST":
    case "APPROVAL_REMINDER": {
      const visit = await loadVisitRouting(ctx, event.visitId);
      if (!visit) {
        return [];
      }

      const recipientIds = await resolveApproverUserIds(ctx, visit);
      const isReminder = event.kind === "APPROVAL_REMINDER";

      return payloadForRecipients(recipientIds, {
        type: isReminder ? "APPROVAL_REMINDER" : "APPROVAL_REQUEST",
        category: "approvals",
        title: isReminder ? "Approval reminder" : "Visit approval required",
        message: isReminder
          ? `${event.visitorName}'s visit is still awaiting approval.`
          : `${event.visitorName} requires visit approval.`,
        visitId: event.visitId,
        visitorId: event.visitorId,
        resourceType: "Visit",
        resourceId: event.visitId,
      });
    }

    case "VISIT_APPROVED":
    case "VISIT_REJECTED": {
      const visit = await loadVisitRouting(ctx, event.visitId);
      if (!visit) {
        return [];
      }

      const approvers = await resolveApproverUserIds(ctx, visit);
      const recipientIds = uniqueRecipientIds([
        ...approvers,
        visit.host.userId,
      ]);
      const approved = event.kind === "VISIT_APPROVED";

      return payloadForRecipients(recipientIds, {
        type: approved ? "VISIT_APPROVED" : "VISIT_REJECTED",
        category: "approvals",
        title: approved ? "Visit approved" : "Visit rejected",
        message: approved
          ? `Visit approved for ${event.visitorName}.`
          : event.reason
            ? `Visit rejected for ${event.visitorName}: ${event.reason}`
            : `Visit rejected for ${event.visitorName}.`,
        visitId: event.visitId,
        visitorId: event.visitorId,
        actorId: event.actorId,
        resourceType: "Visit",
        resourceId: event.visitId,
      });
    }

    case "VISIT_CANCELLED": {
      const visit = await loadVisitRouting(ctx, event.visitId);
      if (!visit) {
        return [];
      }

      return payloadForRecipients([visit.host.userId], {
        type: "VISIT_CANCELLED",
        category: "approvals",
        title: "Visit cancelled",
        message: event.reason
          ? `Visit cancelled for ${event.visitorName}: ${event.reason}`
          : `Visit cancelled for ${event.visitorName}.`,
        visitId: event.visitId,
        visitorId: event.visitorId,
        actorId: event.actorId,
        resourceType: "Visit",
        resourceId: event.visitId,
      });
    }

    case "VISIT_COMPLETED": {
      return payloadForRecipients([event.hostUserId], {
        type: "VISIT_COMPLETED",
        category: "arrivals",
        title: "Visit completed",
        message: `${event.visitorName} has checked out.`,
        visitId: event.visitId,
        visitorId: event.visitorId,
        resourceType: "Visit",
        resourceId: event.visitId,
      });
    }

    case "SECURITY_OVERRIDE": {
      const securityIds = await resolveSecurityUserIds(ctx);
      const orgAdminIds = await resolveOrgAdminUserIds(ctx);
      const platformAdminIds = await resolvePlatformAdminUserIds();
      const recipientIds = uniqueRecipientIds([
        ...securityIds,
        ...orgAdminIds,
        ...platformAdminIds,
      ]);

      return payloadForRecipients(recipientIds, {
        type: "SECURITY_OVERRIDE",
        category: "system",
        title: "Security override",
        message: `${event.action.replace("_", " ")} for ${event.visitorName}.`,
        visitId: event.visitId,
        visitorId: event.visitorId,
        actorId: event.actorId,
        resourceType: "Visit",
        resourceId: event.visitId,
        metadata: { action: event.action },
      });
    }
  }
}

export async function mapPlatformEventToNotifications(
  event: PlatformNotificationEvent,
): Promise<NotificationPayload[]> {
  const platformAdminIds = await resolvePlatformAdminUserIds();

  switch (event.kind) {
    case "ORG_ONBOARDING_REQUESTED":
      return payloadForRecipients(platformAdminIds, {
        type: "ORG_ONBOARDING_REQUESTED",
        category: "system",
        title: "New organization request",
        message: `${event.organizationName} requested onboarding (${event.contactPerson}).`,
        resourceType: "OrganizationRequest",
        resourceId: event.requestId,
        metadata: {
          organizationName: event.organizationName,
          contactEmail: event.contactEmail,
        },
      });

    case "ORG_APPROVED":
      return payloadForRecipients(platformAdminIds, {
        type: "ORG_APPROVED",
        category: "system",
        title: "Organization approved",
        message: `${event.organizationName} was approved.`,
        resourceType: "OrganizationRequest",
        resourceId: event.requestId,
        metadata: {
          organizationId: event.organizationId,
          contactEmail: event.contactEmail,
        },
      });

    case "ORG_REJECTED":
      return payloadForRecipients(platformAdminIds, {
        type: "ORG_REJECTED",
        category: "system",
        title: "Organization request rejected",
        message: event.reason
          ? `${event.organizationName} was rejected: ${event.reason}`
          : `${event.organizationName} was rejected.`,
        resourceType: "OrganizationRequest",
        resourceId: event.requestId,
        metadata: {
          contactEmail: event.contactEmail,
          reason: event.reason,
        },
      });

    case "ORG_SUSPENDED":
      return payloadForRecipients(platformAdminIds, {
        type: "ORG_SUSPENDED",
        category: "system",
        title: "Organization suspended",
        message: event.reason
          ? `${event.organizationName} was suspended: ${event.reason}`
          : `${event.organizationName} was suspended.`,
        resourceType: "Organization",
        resourceId: event.organizationId,
        metadata: { reason: event.reason },
      });

    case "DUPLICATE_DETECTED":
      if (event.confidence !== "HIGH") {
        return [];
      }

      return payloadForRecipients(platformAdminIds, {
        type: "DUPLICATE_DETECTED",
        category: "system",
        title: "High-confidence duplicate visitors",
        message: event.reason,
        resourceType: "Visitor",
        resourceId: event.visitorIds[0],
        metadata: {
          confidence: event.confidence,
          visitorIds: event.visitorIds,
          organizationId: event.organizationId,
        },
      });

    case "KIOSK_SESSION_FAILED":
      if (event.failureCount < 3) {
        return [];
      }

      return payloadForRecipients(platformAdminIds, {
        type: "KIOSK_SESSION_FAILED",
        category: "system",
        title: "Kiosk session failures",
        message: event.reason,
        resourceType: "Branch",
        resourceId: event.branchId ?? event.organizationId,
        metadata: {
          failureCount: event.failureCount,
          kioskId: event.kioskId,
          organizationId: event.organizationId,
        },
      });
  }
}
