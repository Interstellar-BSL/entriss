import { deliverTransactionalEmail } from "@/lib/notifications/channels/email.channel";

function resolveAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function sendOrganizationApprovalEmail(input: {
  to: string;
  contactName: string;
  organizationName: string;
  setupPasswordUrl: string;
}) {
  const subject = "Your organization has been approved";
  const text = [
    `Hello ${input.contactName},`,
    "",
    `Your organization "${input.organizationName}" has been approved on Entriss.`,
    "",
    "Set your password and activate your admin account:",
    input.setupPasswordUrl,
    "",
    "This link expires in 7 days.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;color:#111827;line-height:1.6;">
    <p>Hello <strong>${input.contactName}</strong>,</p>
    <p>Your organization <strong>${input.organizationName}</strong> has been approved on Entriss.</p>
    <p><a href="${input.setupPasswordUrl}" style="display:inline-block;padding:12px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Set your password</a></p>
    <p style="font-size:13px;color:#6b7280;">Setup link: ${input.setupPasswordUrl}</p>
    <p style="font-size:13px;color:#6b7280;">This link expires in 7 days.</p>
  </body>
</html>`;

  await deliverTransactionalEmail({ to: input.to, subject, html, text });
}

export async function sendOrganizationRejectionEmail(input: {
  to: string;
  contactName: string;
  organizationName: string;
  reason: string;
}) {
  const subject = `Update on your ${input.organizationName} access request`;
  const text = [
    `Hello ${input.contactName},`,
    "",
    `Your organization access request for "${input.organizationName}" was not approved at this time.`,
    "",
    `Reason: ${input.reason}`,
    "",
    "You may contact platform support if you have questions.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;color:#111827;line-height:1.6;">
    <p>Hello <strong>${input.contactName}</strong>,</p>
    <p>Your organization access request for <strong>${input.organizationName}</strong> was not approved at this time.</p>
    <p><strong>Reason:</strong> ${input.reason}</p>
    <p style="font-size:13px;color:#6b7280;">You may contact platform support if you have questions.</p>
  </body>
</html>`;

  await deliverTransactionalEmail({ to: input.to, subject, html, text });
}

export function buildSetupPasswordAbsoluteUrl(token: string) {
  return `${resolveAppBaseUrl()}/setup-password?token=${encodeURIComponent(token)}`;
}

/** @deprecated Use buildSetupPasswordAbsoluteUrl for org admin onboarding */
export function buildInviteAbsoluteUrl(inviteToken: string) {
  return `${resolveAppBaseUrl()}/accept-invite?token=${encodeURIComponent(inviteToken)}`;
}

export function buildLoginAbsoluteUrl() {
  return `${resolveAppBaseUrl()}/login`;
}
