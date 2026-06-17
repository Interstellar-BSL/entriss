import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import type { EmailMessage } from "./email.message";

let cachedTransport: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null =
  null;
let configLogged = false;

function maskSecret(value: string | undefined): string {
  if (!value) {
    return "(not set)";
  }
  if (value.length <= 4) {
    return "****";
  }
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

function extractEmailAddress(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS,
  );
}

export function getSmtpFromAddress(): string {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "Entriss <notifications@entriss.local>"
  );
}

export function getSmtpConfigSummary() {
  const host = process.env.SMTP_HOST?.trim() ?? "(not set)";
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim() ?? "(not set)";
  const from = getSmtpFromAddress();
  const fromEmail = extractEmailAddress(from);
  const userEmail = extractEmailAddress(user);
  const fromMatchesUser =
    fromEmail && userEmail ? fromEmail === userEmail : null;

  return {
    configured: isSmtpConfigured(),
    host,
    port,
    secure: false,
    requireTLS: true,
    user,
    from,
    fromMatchesUser,
    pass: maskSecret(process.env.SMTP_PASS),
  };
}

export function logSmtpConfigOnce() {
  if (configLogged) {
    return;
  }

  configLogged = true;
  const summary = getSmtpConfigSummary();

  console.info("[SMTP CONFIG]", {
    configured: summary.configured,
    host: summary.host,
    port: summary.port,
    secure: summary.secure,
    requireTLS: summary.requireTLS,
    user: summary.user,
    from: summary.from,
    fromMatchesUser: summary.fromMatchesUser,
    pass: summary.pass,
  });

  if (summary.configured && summary.fromMatchesUser === false) {
    console.warn(
      "[SMTP CONFIG] SMTP_FROM address does not match SMTP_USER. Microsoft 365 often requires the authenticated mailbox to match the From address.",
    );
  }
}

export interface SmtpErrorDetails {
  message: string;
  code?: string;
  responseCode?: number;
  command?: string;
  response?: string;
  username?: string;
}

export function extractSmtpErrorDetails(error: unknown): SmtpErrorDetails {
  const err = error as {
    message?: string;
    code?: string;
    responseCode?: number;
    command?: string;
    response?: string;
  };

  return {
    message: err.message ?? "Unknown SMTP error",
    code: err.code,
    responseCode: err.responseCode,
    command: err.command,
    response: err.response,
    username: process.env.SMTP_USER?.trim(),
  };
}

export function logSmtpError(error: unknown, context: string) {
  const details = extractSmtpErrorDetails(error);
  console.error(`[SMTP ERROR] ${context}`, details);
}

export function getSmtpTransport():
  | nodemailer.Transporter<SMTPTransport.SentMessageInfo>
  | null {
  logSmtpConfigOnce();

  if (!isSmtpConfigured()) {
    return null;
  }

  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS,
      },
      tls: {
        minVersion: "TLSv1.2",
      },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
    });
  }

  return cachedTransport;
}

export async function sendViaSmtp(email: EmailMessage): Promise<void> {
  const transport = getSmtpTransport();
  if (!transport || !isSmtpConfigured()) {
    throw new Error("SMTP is not configured");
  }

  await transport.sendMail({
    from: getSmtpFromAddress(),
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  console.info("[EMAIL:SMTP] sent", { to: email.to, subject: email.subject });
}

export interface SmtpVerificationResult {
  configured: boolean;
  ok: boolean;
  message: string;
  config: ReturnType<typeof getSmtpConfigSummary>;
  details?: SmtpErrorDetails;
  hints?: string[];
}

export async function verifySmtpTransport(): Promise<SmtpVerificationResult> {
  const config = getSmtpConfigSummary();
  const hints: string[] = [];

  if (!config.configured) {
    return {
      configured: false,
      ok: false,
      message: "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
      config,
      hints: [
        "Add SMTP_HOST=smtp.office365.com",
        "Add SMTP_PORT=587",
        "Add SMTP_USER=your-mailbox@yourdomain.com",
        "Add SMTP_PASS=app-password-or-exchange-password",
        'Add SMTP_FROM="Entriss <your-mailbox@yourdomain.com>"',
      ],
    };
  }

  if (config.fromMatchesUser === false) {
    hints.push(
      "Set SMTP_FROM to the same mailbox as SMTP_USER. Microsoft 365 rejects mismatched From addresses.",
    );
  }

  hints.push(
    "Ensure SMTP AUTH is enabled for the mailbox in Microsoft 365 admin center.",
    "If MFA is enabled, use a Microsoft App Password (not your regular account password).",
    "Verify the mailbox has an Exchange Online license and can send mail.",
  );

  const transport = getSmtpTransport();
  if (!transport) {
    return {
      configured: false,
      ok: false,
      message: "SMTP transport could not be created.",
      config,
      hints,
    };
  }

  try {
    await transport.verify();
    return {
      configured: true,
      ok: true,
      message: "SMTP connection and authentication succeeded.",
      config,
      hints,
    };
  } catch (error) {
    const details = extractSmtpErrorDetails(error);

    if (details.responseCode === 535 || details.response?.includes("5.7.139")) {
      hints.unshift(
        "Authentication failed (535 5.7.139): use an app password if MFA is on, confirm SMTP AUTH is enabled, and ensure SMTP_USER matches the licensed mailbox.",
      );
    }

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
