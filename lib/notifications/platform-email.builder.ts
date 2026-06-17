import type { TenantContext } from "@/lib/tenant/tenant-context";
import { resolvePlatformAdminRecipients } from "./recipients";
import type {
  NotificationDomainEvent,
  PlatformNotificationEvent,
} from "./types";

export type PlatformEmailType =
  | "PLATFORM_ORG_ONBOARDING_REQUESTED"
  | "PLATFORM_ORG_APPROVED"
  | "PLATFORM_ORG_REJECTED"
  | "PLATFORM_ORG_SUSPENDED"
  | "PLATFORM_SECURITY_OVERRIDE"
  | "PLATFORM_FORCE_CHECKIN"
  | "PLATFORM_DUPLICATE_DETECTED"
  | "PLATFORM_KIOSK_SESSION_FAILED";

export type PlatformEmailJob = {
  to: string;
  type: PlatformEmailType;
  idempotencyKey: string;
  subject: string;
  html: string;
  text: string;
  visitId?: string;
  resourceId?: string;
};

function buildJobsForAdmins(
  admins: Array<{ email: string }>,
  input: Omit<PlatformEmailJob, "to">,
): PlatformEmailJob[] {
  return admins.map((admin) => ({
    ...input,
    to: admin.email,
    idempotencyKey: `${input.idempotencyKey}-${admin.email.toLowerCase()}`,
  }));
}

export async function buildPlatformAdminAlertEmailJobs(
  ctx: TenantContext,
  event: NotificationDomainEvent,
): Promise<PlatformEmailJob[]> {
  const admins = await resolvePlatformAdminRecipients();
  if (admins.length === 0) {
    return [];
  }

  const jobs: PlatformEmailJob[] = [];

  if (event.kind === "SECURITY_OVERRIDE") {
    const body = renderPlatformEmailBody({
      headline: "Security override alert",
      lines: [
        `Action: ${event.action.replace("_", " ")}`,
        `Visitor: ${event.visitorName}`,
        `Visit ID: ${event.visitId}`,
        `Organization: ${ctx.activeOrganization.name}`,
      ],
    });

    jobs.push(
      ...buildJobsForAdmins(admins, {
        type: "PLATFORM_SECURITY_OVERRIDE",
        idempotencyKey: `security-override-${event.visitId}-${event.action}`,
        subject: `[Entriss] Security override: ${event.action.replace("_", " ")}`,
        ...body,
        visitId: event.visitId,
      }),
    );
    return jobs;
  }

  if (event.kind === "VISITOR_ARRIVED" && event.forced) {
    const body = renderPlatformEmailBody({
      headline: "Force check-in alert",
      lines: [
        `Visitor: ${event.visitorName}`,
        `Visit ID: ${event.visitId}`,
        `Organization: ${ctx.activeOrganization.name}`,
      ],
    });

    jobs.push(
      ...buildJobsForAdmins(admins, {
        type: "PLATFORM_FORCE_CHECKIN",
        idempotencyKey: `force-checkin-${event.visitId}`,
        subject: "[Entriss] Force check-in performed",
        ...body,
        visitId: event.visitId,
      }),
    );
  }

  return jobs;
}

function renderPlatformEmailBody(input: {
  headline: string;
  lines: string[];
}): { html: string; text: string } {
  const text = [input.headline, "", ...input.lines].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">${input.headline}</h2>
      ${input.lines.map((line) => `<p style="margin:0 0 8px">${line}</p>`).join("")}
    </div>
  `.trim();

  return { html, text };
}

/** @deprecated Use queue producer — kept for backward compatibility. */
export async function buildAndEnqueuePlatformAdminAlertEmails(
  ctx: TenantContext,
  event: NotificationDomainEvent,
) {
  return buildPlatformAdminAlertEmailJobs(ctx, event);
}

export async function buildPlatformEmailJobs(
  event: PlatformNotificationEvent,
): Promise<PlatformEmailJob[]> {
  const admins = await resolvePlatformAdminRecipients();
  if (admins.length === 0) {
    return [];
  }

  switch (event.kind) {
    case "ORG_ONBOARDING_REQUESTED": {
      const body = renderPlatformEmailBody({
        headline: "New organization onboarding request",
        lines: [
          `Organization: ${event.organizationName}`,
          `Contact: ${event.contactPerson}`,
          `Email: ${event.contactEmail}`,
          `Request ID: ${event.requestId}`,
        ],
      });

      return buildJobsForAdmins(admins, {
        type: "PLATFORM_ORG_ONBOARDING_REQUESTED",
        idempotencyKey: `org-request-${event.requestId}`,
        subject: `[Entriss] New org request: ${event.organizationName}`,
        ...body,
        resourceId: event.requestId,
      });
    }

    case "ORG_APPROVED": {
      const body = renderPlatformEmailBody({
        headline: "Organization approved",
        lines: [
          `Organization: ${event.organizationName}`,
          `Organization ID: ${event.organizationId}`,
          `Contact email: ${event.contactEmail}`,
        ],
      });

      return buildJobsForAdmins(admins, {
        type: "PLATFORM_ORG_APPROVED",
        idempotencyKey: `org-approved-${event.requestId}`,
        subject: `[Entriss] Organization approved: ${event.organizationName}`,
        ...body,
        resourceId: event.requestId,
      });
    }

    case "ORG_REJECTED": {
      const body = renderPlatformEmailBody({
        headline: "Organization request rejected",
        lines: [
          `Organization: ${event.organizationName}`,
          `Contact email: ${event.contactEmail}`,
          event.reason ? `Reason: ${event.reason}` : "",
        ].filter(Boolean),
      });

      return buildJobsForAdmins(admins, {
        type: "PLATFORM_ORG_REJECTED",
        idempotencyKey: `org-rejected-${event.requestId}`,
        subject: `[Entriss] Organization rejected: ${event.organizationName}`,
        ...body,
        resourceId: event.requestId,
      });
    }

    case "ORG_SUSPENDED": {
      const body = renderPlatformEmailBody({
        headline: "Organization suspended",
        lines: [
          `Organization: ${event.organizationName}`,
          `Organization ID: ${event.organizationId}`,
          event.reason ? `Reason: ${event.reason}` : "",
        ].filter(Boolean),
      });

      return buildJobsForAdmins(admins, {
        type: "PLATFORM_ORG_SUSPENDED",
        idempotencyKey: `org-suspended-${event.organizationId}`,
        subject: `[Entriss] Organization suspended: ${event.organizationName}`,
        ...body,
        resourceId: event.organizationId,
      });
    }

    case "DUPLICATE_DETECTED": {
      if (event.confidence !== "HIGH") {
        return [];
      }

      const body = renderPlatformEmailBody({
        headline: "High-confidence duplicate visitors detected",
        lines: [
          event.reason,
          `Organization ID: ${event.organizationId}`,
          `Visitor IDs: ${event.visitorIds.join(", ")}`,
        ],
      });

      return buildJobsForAdmins(admins, {
        type: "PLATFORM_DUPLICATE_DETECTED",
        idempotencyKey: `duplicate-${event.organizationId}-${event.visitorIds.join("-")}`,
        subject: "[Entriss] High-confidence duplicate visitors",
        ...body,
        resourceId: event.visitorIds[0],
      });
    }

    case "KIOSK_SESSION_FAILED": {
      if (event.failureCount < 3) {
        return [];
      }

      const body = renderPlatformEmailBody({
        headline: "Repeated kiosk session failures",
        lines: [
          event.reason,
          `Failure count: ${event.failureCount}`,
          `Organization ID: ${event.organizationId}`,
          event.branchId ? `Branch ID: ${event.branchId}` : "",
          event.kioskId ? `Kiosk ID: ${event.kioskId}` : "",
        ].filter(Boolean),
      });

      return buildJobsForAdmins(admins, {
        type: "PLATFORM_KIOSK_SESSION_FAILED",
        idempotencyKey: `kiosk-fail-${event.organizationId}-${event.failureCount}`,
        subject: "[Entriss] Kiosk session failures",
        ...body,
        resourceId: event.branchId ?? event.organizationId,
      });
    }
  }
}

/** @deprecated Use queue producer — kept for backward compatibility. */
export async function buildAndEnqueuePlatformEmails(
  event: PlatformNotificationEvent,
) {
  return buildPlatformEmailJobs(event);
}
