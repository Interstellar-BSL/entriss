import { prisma } from "@/lib/db/client";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import { generateVisitQRCodeEmailPayload } from "@/lib/visits/qr/qr-email-generator";

import { resolveApproverUserIds } from "../recipients";
import type { NotificationDomainEvent } from "../types";
import { APPROVAL_REMINDER_THRESHOLD_MS } from "../types";
import type { TransactionalEmailPayload, TransactionalEmailType } from "./email.types";

function resolveAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function formatVisitorName(visitor: { firstName: string; lastName: string }) {
  return `${visitor.firstName} ${visitor.lastName}`.trim();
}

function formatHostName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

function formatVisitDuration(checkedInAt: Date, checkedOutAt: Date) {
  const minutes = Math.max(
    0,
    Math.floor((checkedOutAt.getTime() - checkedInAt.getTime()) / 60_000),
  );
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainder}m`;
  }

  return `${remainder} minute${remainder === 1 ? "" : "s"}`;
}

function buildIdempotencyKey(
  visitId: string,
  emailType: TransactionalEmailType,
  toEmail: string,
) {
  return `${visitId}-${emailType}-${toEmail.toLowerCase()}`;
}

function mapEventToEmailTypes(
  event: NotificationDomainEvent,
): TransactionalEmailType[] {
  switch (event.kind) {
    case "VISITOR_ARRIVED":
      return ["VISITOR_CHECKED_IN", "HOST_VISITOR_ARRIVED"];
    case "VISIT_COMPLETED":
      return ["VISITOR_CHECKED_OUT"];
    case "VISIT_APPROVED":
      return ["VISITOR_APPROVED"];
    case "VISIT_REJECTED":
      return ["VISITOR_REJECTED"];
    case "VISIT_CANCELLED":
      return ["VISITOR_CANCELLED"];
    case "APPROVAL_REQUEST":
      return ["APPROVAL_REQUEST"];
    case "APPROVAL_REMINDER":
      return ["APPROVAL_REMINDER"];
    default:
      return [];
  }
}

async function loadVisitEmailContext(ctx: TenantContext, visitId: string) {
  return prisma.visit.findFirst({
    where: { id: visitId, organizationId: ctx.organizationId },
    include: {
      visitor: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      branch: {
        select: { name: true, address: true },
      },
      host: {
        select: {
          user: { select: { name: true, email: true } },
        },
      },
      organization: {
        select: {
          name: true,
          organizationSettings: {
            select: {
              logoUrl: true,
              primaryColor: true,
            },
          },
        },
      },
    },
  });
}

function visitReferenceLabel(
  visit: NonNullable<Awaited<ReturnType<typeof loadVisitEmailContext>>>,
) {
  return visit.badgeNumber?.trim() || visit.id;
}

async function buildHostArrivalPayload(
  visit: NonNullable<Awaited<ReturnType<typeof loadVisitEmailContext>>>,
): Promise<TransactionalEmailPayload | null> {
  const hostEmail = visit.host.user.email.trim();
  if (!hostEmail) {
    return null;
  }

  return {
    to: hostEmail,
    type: "HOST_VISITOR_ARRIVED",
    idempotencyKey: buildIdempotencyKey(visit.id, "HOST_VISITOR_ARRIVED", hostEmail),
    visitor: {
      name: formatVisitorName(visit.visitor),
      email: visit.visitor.email ?? hostEmail,
      phone: visit.visitor.phone ?? undefined,
    },
    visit: {
      id: visit.id,
      status: visit.status,
      scheduledAt: visit.scheduledAt?.toISOString(),
      checkedInAt: visit.checkedInAt?.toISOString(),
      purpose: visit.purpose ?? undefined,
      visitReference: visitReferenceLabel(visit),
    },
    host: {
      name: formatHostName(visit.host.user),
      email: hostEmail,
    },
    branch: {
      name: visit.branch.name,
      address: visit.branch.address ?? undefined,
    },
    organizationName: visit.organization.name,
    organizationLogoUrl: visit.organization.organizationSettings?.logoUrl ?? undefined,
    organizationPrimaryColor:
      visit.organization.organizationSettings?.primaryColor ?? undefined,
  };
}

async function buildVisitorPayload(
  ctx: TenantContext,
  visit: NonNullable<Awaited<ReturnType<typeof loadVisitEmailContext>>>,
  type: TransactionalEmailType,
  extras?: {
    rejectReason?: string;
    cancelReason?: string;
  },
): Promise<TransactionalEmailPayload | null> {
  const visitorEmail = visit.visitor.email?.trim();
  if (!visitorEmail) {
    return null;
  }

  let qrCode: string | undefined;
  if (type === "VISITOR_APPROVED" || type === "VISITOR_CHECKED_IN") {
    const qr = await generateVisitQRCodeEmailPayload(ctx, visit.id);
    qrCode = qr.qrImage;
  }

  const payload: TransactionalEmailPayload = {
    to: visitorEmail,
    type,
    idempotencyKey: buildIdempotencyKey(visit.id, type, visitorEmail),
    visitor: {
      name: formatVisitorName(visit.visitor),
      email: visitorEmail,
      phone: visit.visitor.phone ?? undefined,
    },
    visit: {
      id: visit.id,
      status: visit.status,
      scheduledAt: visit.scheduledAt?.toISOString(),
      checkedInAt: visit.checkedInAt?.toISOString(),
      checkedOutAt: visit.checkedOutAt?.toISOString(),
      purpose: visit.purpose ?? undefined,
      visitReference: visitReferenceLabel(visit),
      rejectReason: extras?.rejectReason,
      cancelReason: extras?.cancelReason,
      visitDuration:
        visit.checkedInAt && visit.checkedOutAt
          ? formatVisitDuration(visit.checkedInAt, visit.checkedOutAt)
          : undefined,
    },
    host: {
      name: formatHostName(visit.host.user),
      email: visit.host.user.email,
    },
    branch: {
      name: visit.branch.name,
      address: visit.branch.address ?? undefined,
    },
    organizationName: visit.organization.name,
    organizationLogoUrl: visit.organization.organizationSettings?.logoUrl ?? undefined,
    organizationPrimaryColor:
      visit.organization.organizationSettings?.primaryColor ?? undefined,
    qrCode,
  };

  return payload;
}

async function buildHostApprovalPayloads(
  ctx: TenantContext,
  visit: NonNullable<Awaited<ReturnType<typeof loadVisitEmailContext>>>,
  type: "APPROVAL_REQUEST" | "APPROVAL_REMINDER",
): Promise<TransactionalEmailPayload[]> {
  const approverUserIds = await resolveApproverUserIds(ctx, {
    branchId: visit.branchId,
    hostMemberId: visit.hostMemberId,
  });

  if (approverUserIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: { id: { in: approverUserIds }, isActive: true },
    select: { email: true, name: true },
  });

  const approvalUrl = `${resolveAppBaseUrl()}/approvals`;
  const payloads: TransactionalEmailPayload[] = [];

  for (const user of users) {
    const to = user.email.trim();
    if (!to) {
      continue;
    }

    payloads.push({
      to,
      type,
      idempotencyKey: buildIdempotencyKey(visit.id, type, to),
      visitor: {
        name: formatVisitorName(visit.visitor),
        email: visit.visitor.email ?? to,
        phone: visit.visitor.phone ?? undefined,
      },
      visit: {
        id: visit.id,
        status: visit.status,
        scheduledAt: visit.scheduledAt?.toISOString(),
        purpose: visit.purpose ?? undefined,
        visitReference: visitReferenceLabel(visit),
      },
      host: {
        name: formatHostName(visit.host.user),
        email: visit.host.user.email,
      },
      branch: {
        name: visit.branch.name,
        address: visit.branch.address ?? undefined,
      },
      organizationName: visit.organization.name,
      approvalUrl,
      isReminder: type === "APPROVAL_REMINDER",
    });
  }

  return payloads;
}

export async function buildTransactionalEmailsFromEvent(
  ctx: TenantContext,
  event: NotificationDomainEvent,
): Promise<TransactionalEmailPayload[]> {
  const emailTypes = mapEventToEmailTypes(event);
  if (emailTypes.length === 0 || !("visitId" in event)) {
    return [];
  }

  const visit = await loadVisitEmailContext(ctx, event.visitId);
  if (!visit) {
    return [];
  }

  const payloads: TransactionalEmailPayload[] = [];

  for (const type of emailTypes) {
    if (type === "APPROVAL_REQUEST" || type === "APPROVAL_REMINDER") {
      payloads.push(...(await buildHostApprovalPayloads(ctx, visit, type)));
      continue;
    }

    if (type === "HOST_VISITOR_ARRIVED") {
      const hostPayload = await buildHostArrivalPayload(visit);
      if (hostPayload) {
        payloads.push(hostPayload);
      }
      continue;
    }

    const payload = await buildVisitorPayload(ctx, visit, type, {
      rejectReason:
        event.kind === "VISIT_REJECTED" ? event.reason : undefined,
      cancelReason:
        event.kind === "VISIT_CANCELLED" ? event.reason : undefined,
    });

    if (payload) {
      payloads.push(payload);
    }
  }

  return payloads;
}

async function hasRecentReminderEmail(
  ctx: TenantContext,
  visitId: string,
  toEmail: string,
) {
  const threshold = new Date(Date.now() - APPROVAL_REMINDER_THRESHOLD_MS);

  const recent = await prisma.emailDeliveryLog.findFirst({
    where: {
      organizationId: ctx.organizationId,
      visitId,
      emailType: "APPROVAL_REMINDER",
      toEmail: toEmail.toLowerCase(),
      status: "sent",
      sentAt: { gte: threshold },
    },
    select: { id: true },
  });

  return Boolean(recent);
}

/** Used by queue producer to avoid duplicate reminder emails. */
export async function shouldSkipReminderEmail(
  ctx: TenantContext,
  visitId: string,
  toEmail: string,
) {
  return hasRecentReminderEmail(ctx, visitId, toEmail);
}

/** @deprecated Delivery is handled by the notification worker queue. */
export async function buildAndEnqueueTransactionalEmails(
  ctx: TenantContext,
  event: NotificationDomainEvent,
) {
  return buildTransactionalEmailsFromEvent(ctx, event);
}
