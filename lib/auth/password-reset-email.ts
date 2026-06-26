import { deliverTransactionalEmail } from "@/lib/notifications/channels/email.channel";
import { DEFAULT_ORGANIZATION_SETTINGS } from "@/lib/settings/defaults";

function resolveAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function buildPasswordResetUrl(rawToken: string) {
  return `${resolveAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetToken: string;
  expiresAt: Date;
  organizationName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
}) {
  const resetUrl = buildPasswordResetUrl(input.resetToken);
  const orgName = input.organizationName?.trim() || "Entriss";
  const primaryColor =
    input.primaryColor?.trim() || DEFAULT_ORGANIZATION_SETTINGS.primaryColor;
  const expiryLabel = input.expiresAt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const subject = "Reset your Entriss password";
  const text = [
    `We received a request to reset the password for your ${orgName} account on Entriss.`,
    "",
    `Reset your password: ${resetUrl}`,
    "",
    `This link expires on ${expiryLabel} and can only be used once.`,
    "",
    "If you did not request a password reset, you can safely ignore this email.",
  ].join("\n");

  const logoBlock = input.logoUrl?.trim()
    ? `<img src="${escapeHtml(input.logoUrl.trim())}" alt="${escapeHtml(orgName)}" width="48" height="48" style="display:block;border-radius:8px;object-fit:cover;" />`
    : `<div style="width:48px;height:48px;border-radius:8px;background:${escapeHtml(primaryColor)};color:#fff;font-weight:700;font-size:20px;line-height:48px;text-align:center;">${escapeHtml(orgName.charAt(0).toUpperCase())}</div>`;

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;color:#111827;line-height:1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;">
                ${logoBlock}
                <p style="margin:16px 0 0;font-size:13px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(orgName)}</p>
                <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#111827;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px;">
                <p style="margin:0;font-size:15px;color:#374151;">
                  We received a request to reset the password for your Entriss account.
                  Click the button below to choose a new password.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 20px;">
                <a href="${resetUrl}" style="display:inline-block;padding:12px 22px;background:${escapeHtml(primaryColor)};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Reset password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                <p style="margin:0;font-size:13px;color:#6b7280;">
                  This secure link expires on <strong>${escapeHtml(expiryLabel)}</strong> and can only be used once.
                </p>
                <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
                  If you did not request this reset, you can safely ignore this email. Your password will not change.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  Sent by Entriss Visitor Management
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await deliverTransactionalEmail({
    to: input.to,
    subject,
    html,
    text,
  });
}
