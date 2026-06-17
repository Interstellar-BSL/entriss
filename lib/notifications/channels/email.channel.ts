import type {
  INotificationChannel,
  NotificationChannelMessage,
} from "./channel.types";
import { EmailDeliveryError, type EmailMessage } from "./email.message";
import {
  extractGraphErrorDetails,
  logGraphError,
  sendViaMicrosoftGraph,
} from "./microsoft-graph.email";
import { isGraphConfigured } from "@/lib/integrations/microsoft/graph-config";
import {
  isSmtpConfigured,
  logSmtpError,
  sendViaSmtp,
} from "./smtp.transport";

function deliverToConsole(email: EmailMessage, reason: string) {
  console.info("[email:console-fallback]", reason, {
    to: email.to,
    subject: email.subject,
    textPreview: email.text?.slice(0, 200) ?? email.html.slice(0, 200),
  });
}

export type { EmailMessage } from "./email.message";
export { EmailDeliveryError } from "./email.message";

/**
 * Delivers a transactional email.
 * Priority: Microsoft Graph → SMTP fallback → console (dev only).
 * Throws EmailDeliveryError when all providers fail (enables queue retries).
 */
export async function deliverTransactionalEmail(email: EmailMessage): Promise<void> {
  const failures: { graph?: string; smtp?: string } = {};
  let graphAttempted = false;

  if (isGraphConfigured()) {
    graphAttempted = true;
    try {
      await sendViaMicrosoftGraph(email);
      return;
    } catch (error) {
      failures.graph = extractGraphErrorDetails(error).message;
      logGraphError(error, "deliverTransactionalEmail");
      console.warn("[EMAIL:SMTP] fallback triggered - Graph failed or disabled");
    }
  }

  if (isSmtpConfigured()) {
    try {
      await sendViaSmtp(email);
      if (graphAttempted) {
        console.warn("[EMAIL:SMTP] SMTP fallback used - Graph failed or disabled");
      }
      return;
    } catch (error) {
      failures.smtp =
        error instanceof Error ? error.message : "SMTP delivery failed";
      logSmtpError(error, "deliverTransactionalEmail");
    }
  }

  if (process.env.NODE_ENV !== "production") {
    deliverToConsole(
      email,
      isGraphConfigured() || isSmtpConfigured()
        ? "all configured providers failed"
        : "no email provider configured",
    );
  }

  throw new EmailDeliveryError(
    failures.graph && failures.smtp
      ? `Email delivery failed (Graph: ${failures.graph}; SMTP: ${failures.smtp})`
      : failures.graph
        ? `Email delivery failed via Graph: ${failures.graph}`
        : failures.smtp
          ? `Email delivery failed via SMTP: ${failures.smtp}`
          : "No email provider configured (Graph or SMTP)",
    failures,
  );
}

/** In-app notification fan-out — transactional visitor/host emails use deliverTransactionalEmail. */
export const emailChannel: INotificationChannel = {
  name: "email",
  async deliver(message: NotificationChannelMessage) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[notifications:email:stub]", message.type, message.recipientId);
    }
  },
};
