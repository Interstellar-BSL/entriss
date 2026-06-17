import { getGraphToken } from "@/lib/integrations/microsoft/graph-auth";
import {
  getGraphConfigSummary,
  getGraphSenderEmail,
  isGraphConfigured,
} from "@/lib/integrations/microsoft/graph-config";

import type { EmailMessage } from "./email.message";

export interface GraphErrorDetails {
  message: string;
  status?: number;
  code?: string;
  responseBody?: string;
  sender?: string;
}

export class GraphEmailError extends Error {
  readonly details: GraphErrorDetails;

  constructor(details: GraphErrorDetails) {
    super(details.message);
    this.name = "GraphEmailError";
    this.details = details;
  }
}

function parseGraphErrorBody(responseText: string): string | undefined {
  try {
    const parsed = JSON.parse(responseText) as {
      error?: { code?: string; message?: string };
    };
    if (parsed.error?.message) {
      return parsed.error.code
        ? `${parsed.error.code}: ${parsed.error.message}`
        : parsed.error.message;
    }
  } catch {
    return responseText;
  }
  return responseText;
}

export function extractGraphErrorDetails(
  error: unknown,
  fallbackMessage = "Microsoft Graph email delivery failed",
): GraphErrorDetails {
  if (error instanceof GraphEmailError) {
    return error.details;
  }

  if (error instanceof Error) {
    return { message: error.message, sender: getGraphSenderEmail() };
  }

  return { message: fallbackMessage, sender: getGraphSenderEmail() };
}

export function logGraphError(error: unknown, context: string) {
  const details = extractGraphErrorDetails(error);
  console.error(`[EMAIL:ERROR] ${context}`, details);
}

export async function sendViaMicrosoftGraph(email: EmailMessage): Promise<void> {
  if (!isGraphConfigured()) {
    throw new GraphEmailError({
      message: "Microsoft Graph is not configured",
    });
  }

  const sender = getGraphSenderEmail();
  if (!sender) {
    throw new GraphEmailError({
      message: "GRAPH_SENDER_EMAIL (or GRAPH_SENDER) is not set",
    });
  }

  console.info("[EMAIL:GRAPH] Sending email to", email.to, {
    subject: email.subject,
    sender,
  });

  const token = await getGraphToken();
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: email.subject,
        body: {
          contentType: "HTML",
          content: email.html,
        },
        toRecipients: [
          {
            emailAddress: {
              address: email.to,
            },
          },
        ],
      },
      saveToSentItems: true,
    }),
  });

  if (response.status === 202 || response.status === 200) {
    console.info("[EMAIL:GRAPH] Success", {
      to: email.to,
      subject: email.subject,
      status: response.status,
    });
    return;
  }

  const responseBody = await response.text();
  const parsedMessage = parseGraphErrorBody(responseBody);

  console.error("[EMAIL:ERROR] Graph sendMail failed", {
    status: response.status,
    to: email.to,
    sender,
    responseBody,
  });

  throw new GraphEmailError({
    message: parsedMessage ?? `Graph sendMail failed (${response.status})`,
    status: response.status,
    responseBody,
    sender,
  });
}

export interface GraphVerificationResult {
  configured: boolean;
  ok: boolean;
  message: string;
  config: ReturnType<typeof getGraphConfigSummary>;
  details?: GraphErrorDetails;
  hints?: string[];
}

export async function verifyMicrosoftGraphEmail(): Promise<GraphVerificationResult> {
  const config = getGraphConfigSummary();
  const hints = [
    "Register an Entra app with application permission Mail.Send (admin consent required).",
    "Ensure GRAPH_SENDER_EMAIL is a licensed mailbox in the tenant.",
    "Client credentials flow requires application permissions, not delegated.",
  ];

  if (!config.configured) {
    return {
      configured: false,
      ok: false,
      message:
        "Microsoft Graph is not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and GRAPH_SENDER_EMAIL.",
      config,
      hints: [
        "AZURE_TENANT_ID= (or GRAPH_TENANT_ID)",
        "AZURE_CLIENT_ID= (or GRAPH_CLIENT_ID)",
        "AZURE_CLIENT_SECRET= (or GRAPH_CLIENT_SECRET)",
        "GRAPH_SENDER_EMAIL=noreply@yourdomain.com (or GRAPH_SENDER)",
        ...hints,
      ],
    };
  }

  try {
    const token = await getGraphToken();
    const sender = getGraphSenderEmail()!;
    const probe = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!probe.ok) {
      const responseBody = await probe.text();
      return {
        configured: true,
        ok: false,
        message: parseGraphErrorBody(responseBody) ?? `Sender lookup failed (${probe.status})`,
        config,
        details: {
          message: "Sender mailbox lookup failed",
          status: probe.status,
          responseBody,
          sender,
        },
        hints: [
          "Confirm GRAPH_SENDER_EMAIL exists and is licensed for Exchange Online.",
          "Grant the app Mail.Send application permission with admin consent.",
          ...hints,
        ],
      };
    }

    return {
      configured: true,
      ok: true,
      message: "Microsoft Graph token acquired and sender mailbox resolved.",
      config,
      hints,
    };
  } catch (error) {
    const details = extractGraphErrorDetails(error);
    return {
      configured: true,
      ok: false,
      message: details.message,
      config,
      details,
      hints,
    };
  }
}
