import type { TransactionalEmailPayload, TransactionalEmailType } from "./email.types";

export interface EmailTemplateDefinition {
  subject: (payload: TransactionalEmailPayload) => string;
  headline: (payload: TransactionalEmailPayload) => string;
  intro: (payload: TransactionalEmailPayload) => string;
  bullets: (payload: TransactionalEmailPayload) => string[];
  footer: (payload: TransactionalEmailPayload) => string;
  includeQr: boolean;
}

function formatWhen(iso?: string) {
  if (!iso) {
    return "Not scheduled";
  }

  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const templates: Record<TransactionalEmailType, EmailTemplateDefinition> = {
  VISITOR_APPROVED: {
    subject: () => "Your visit has been approved",
    headline: (p) => `Hi ${p.visitor.name}, your visit is approved`,
    intro: () =>
      "Your visit request has been approved. Please present the QR code below at reception for check-in.",
    bullets: (p) => [
      `Host: ${p.host?.name ?? "Your host"}`,
      `Location: ${p.branch?.name ?? "Main office"}`,
      p.branch?.address ? `Address: ${p.branch.address}` : "",
      `Scheduled: ${formatWhen(p.visit.scheduledAt)}`,
      `Visit ID: ${p.visit.id}`,
    ].filter(Boolean),
    footer: () => "Arrive a few minutes early and have your ID ready if required.",
    includeQr: true,
  },
  VISITOR_CHECKED_IN: {
    subject: () => "You have successfully checked in",
    headline: (p) => `Welcome, ${p.visitor.name}`,
    intro: () => "You have successfully checked in for your visit.",
    bullets: (p) => [
      `Check-in time: ${formatWhen(p.visit.checkedInAt)}`,
      `Host: ${p.host?.name ?? "Your host"}`,
      `Location: ${p.branch?.name ?? "Main office"}`,
      p.branch?.address ? `Address: ${p.branch.address}` : "",
      `Visit ID: ${p.visit.id}`,
    ].filter(Boolean),
    footer: () => "Your host has been notified of your arrival.",
    includeQr: true,
  },
  VISITOR_CHECKED_OUT: {
    subject: () => "Visit completed successfully",
    headline: (p) => `Thank you, ${p.visitor.name}`,
    intro: () => "Your visit has been completed successfully.",
    bullets: (p) => [
      p.visit.visitDuration ? `Duration: ${p.visit.visitDuration}` : "",
      `Host: ${p.host?.name ?? "Your host"}`,
      `Check-out time: ${formatWhen(p.visit.checkedOutAt)}`,
      `Visit ID: ${p.visit.id}`,
    ].filter(Boolean),
    footer: () => "We hope your visit was productive. Safe travels!",
    includeQr: false,
  },
  VISITOR_REJECTED: {
    subject: () => "Visit request not approved",
    headline: (p) => `Hi ${p.visitor.name}`,
    intro: () => "Unfortunately, your visit request was not approved at this time.",
    bullets: (p) => [
      p.visit.rejectReason ? `Reason: ${p.visit.rejectReason}` : "",
      `Host: ${p.host?.name ?? "Your host"}`,
      `Scheduled: ${formatWhen(p.visit.scheduledAt)}`,
    ].filter(Boolean),
    footer: () =>
      "If you believe this was a mistake, please contact your host or reception for assistance.",
    includeQr: false,
  },
  VISITOR_CANCELLED: {
    subject: () => "Your visit has been cancelled",
    headline: (p) => `Hi ${p.visitor.name}`,
    intro: () => "Your scheduled visit has been cancelled.",
    bullets: (p) => [
      p.visit.cancelReason ? `Reason: ${p.visit.cancelReason}` : "",
      `Scheduled: ${formatWhen(p.visit.scheduledAt)}`,
      `Visit ID: ${p.visit.id}`,
    ].filter(Boolean),
    footer: () => "Contact your host if you need to reschedule.",
    includeQr: false,
  },
  APPROVAL_REQUEST: {
    subject: () => "Approval required for visitor",
    headline: (p) => "Visitor approval required",
    intro: (p) =>
      `${p.visitor.name} is awaiting approval for a visit.`,
    bullets: (p) => [
      `Visitor: ${p.visitor.name}`,
      p.visitor.email ? `Email: ${p.visitor.email}` : "",
      p.visitor.phone ? `Phone: ${p.visitor.phone}` : "",
      `Scheduled: ${formatWhen(p.visit.scheduledAt)}`,
      `Location: ${p.branch?.name ?? "Main office"}`,
      p.visit.purpose ? `Purpose: ${p.visit.purpose}` : "",
    ].filter(Boolean),
    footer: (p) =>
      p.approvalUrl
        ? `Review and approve or reject: ${p.approvalUrl}`
        : "Please log in to review this visit request.",
    includeQr: false,
  },
  APPROVAL_REMINDER: {
    subject: () => "Reminder: Approval required for visitor",
    headline: () => "Approval reminder",
    intro: (p) =>
      `Reminder: ${p.visitor.name}'s visit is still awaiting your approval.`,
    bullets: (p) => [
      `Visitor: ${p.visitor.name}`,
      `Scheduled: ${formatWhen(p.visit.scheduledAt)}`,
      `Location: ${p.branch?.name ?? "Main office"}`,
    ],
    footer: (p) =>
      p.approvalUrl
        ? `Review now: ${p.approvalUrl}`
        : "Please log in to review this visit request.",
    includeQr: false,
  },
  HOST_VISITOR_ARRIVED: {
    subject: (p) => `${p.visitor.name} has arrived`,
    headline: (p) => `${p.visitor.name} has checked in`,
    intro: () => "Your visitor has arrived and checked in.",
    bullets: (p) => [
      `Visitor: ${p.visitor.name}`,
      p.visitor.email ? `Email: ${p.visitor.email}` : "",
      p.visitor.phone ? `Phone: ${p.visitor.phone}` : "",
      `Check-in time: ${formatWhen(p.visit.checkedInAt)}`,
      `Location: ${p.branch?.name ?? "Main office"}`,
      `Visit ID: ${p.visit.id}`,
    ].filter(Boolean),
    footer: () => "Please meet your visitor at reception.",
    includeQr: false,
  },
};

export function getEmailTemplate(type: TransactionalEmailType) {
  return templates[type];
}
