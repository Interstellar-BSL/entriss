import { getEmailTemplate } from "./email.templates";
import type {
  RenderedTransactionalEmail,
  TransactionalEmailPayload,
} from "./email.types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderTransactionalEmail(
  payload: TransactionalEmailPayload,
): RenderedTransactionalEmail {
  const template = getEmailTemplate(payload.type);
  const orgLabel = payload.organizationName
    ? escapeHtml(payload.organizationName)
    : "Entriss";

  const headline = escapeHtml(template.headline(payload));
  const intro = escapeHtml(template.intro(payload));
  const bullets = template
    .bullets(payload)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const footer = escapeHtml(template.footer(payload));

  const qrBlock =
    template.includeQr && payload.qrCode
      ? `<div style="margin:24px 0;text-align:center;">
           <p style="margin:0 0 12px;font-weight:600;">Your check-in QR code</p>
           <img src="${payload.qrCode}" alt="Visit QR code" width="220" height="220" style="border:1px solid #e5e7eb;border-radius:8px;" />
           <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">Present this code at reception</p>
         </div>`
      : "";

  const approvalBlock =
    payload.approvalUrl &&
    (payload.type === "APPROVAL_REQUEST" || payload.type === "APPROVAL_REMINDER")
      ? `<p style="margin:24px 0;">
           <a href="${escapeHtml(payload.approvalUrl)}" style="display:inline-block;padding:12px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
             Review visit request
           </a>
         </p>`
      : "";

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;color:#111827;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${orgLabel}</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${headline}</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${intro}</p>
                <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.7;">${bullets}</ul>
                ${qrBlock}
                ${approvalBlock}
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#4b5563;">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    template.headline(payload),
    "",
    template.intro(payload),
    "",
    ...template.bullets(payload).map((item) => `- ${item}`),
    "",
    template.footer(payload),
  ];

  if (payload.approvalUrl) {
    textLines.push("", `Review: ${payload.approvalUrl}`);
  }

  return {
    to: payload.to,
    subject: template.subject(payload),
    html,
    text: textLines.join("\n"),
  };
}
