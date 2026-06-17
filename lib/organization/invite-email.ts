import { deliverTransactionalEmail } from "@/lib/notifications/channels/email.channel";

function resolveAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function buildAcceptInviteUrl(inviteToken: string) {
  return `${resolveAppBaseUrl()}/accept-invite?token=${encodeURIComponent(inviteToken)}`;
}

export async function sendMemberInviteEmail(input: {
  to: string;
  organizationName: string;
  roleName: string;
  inviteToken: string;
  invitedByName: string;
  expiresAt: Date;
}) {
  const acceptUrl = buildAcceptInviteUrl(input.inviteToken);
  const expiryLabel = input.expiresAt.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
  const subject = `You're invited to join ${input.organizationName} on Entriss`;
  const text = [
    `${input.invitedByName} invited you to join ${input.organizationName} on Entriss as ${input.roleName}.`,
    "",
    `Accept your invitation: ${acceptUrl}`,
    "",
    `This invitation expires on ${expiryLabel}.`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;color:#111827;line-height:1.6;">
    <p><strong>${input.invitedByName}</strong> invited you to join <strong>${input.organizationName}</strong> on Entriss as <strong>${input.roleName}</strong>.</p>
    <p><a href="${acceptUrl}" style="display:inline-block;padding:12px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Accept invitation</a></p>
    <p style="font-size:13px;color:#6b7280;">Expires ${expiryLabel}</p>
    <p style="font-size:13px;color:#6b7280;">Or copy this link: ${acceptUrl}</p>
  </body>
</html>`;

  await deliverTransactionalEmail({
    to: input.to,
    subject,
    html,
    text,
  });
}
