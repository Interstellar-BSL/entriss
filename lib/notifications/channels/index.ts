import { emailChannel } from "./email.channel";
import {
  slackChannel,
  smsChannel,
  teamsChannel,
  whatsappChannel,
} from "./external.channels";
import type { INotificationChannel } from "./channel.types";

export { emailChannel, deliverTransactionalEmail } from "./email.channel";
export type { EmailMessage } from "./email.message";
export { EmailDeliveryError } from "./email.message";
export {
  sendViaMicrosoftGraph,
  verifyMicrosoftGraphEmail,
} from "./microsoft-graph.email";
export { getSmtpTransport, isSmtpConfigured, sendViaSmtp, verifySmtpTransport } from "./smtp.transport";
export type { SmtpErrorDetails, SmtpVerificationResult } from "./smtp.transport";
export { isGraphConfigured, getGraphConfigSummary } from "@/lib/integrations/microsoft/graph-config";

export const notificationChannels: INotificationChannel[] = [
  emailChannel,
  slackChannel,
  teamsChannel,
  smsChannel,
  whatsappChannel,
];

export async function deliverToExternalChannels(
  message: Parameters<INotificationChannel["deliver"]>[0],
) {
  await Promise.allSettled(
    notificationChannels.map((channel) => channel.deliver(message)),
  );
}
