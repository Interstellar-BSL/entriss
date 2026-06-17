import { prisma } from "@/lib/db/client";
import { isPrismaKnownRequestError } from "@/lib/db/prisma-errors";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { deliverTransactionalEmail } from "../channels/email.channel";
import { renderTransactionalEmail } from "../email/email.renderer";
import type { TransactionalEmailPayload } from "../email/email.types";
import type { PlatformEmailJob } from "../platform-email.builder";
import type { DeliveryResult } from "./in-app-delivery";

async function tryClaimDelivery(
  ctx: TenantContext,
  input: {
    idempotencyKey: string;
    emailType: string;
    toEmail: string;
    visitId?: string | null;
  },
) {
  try {
    await prisma.emailDeliveryLog.create({
      data: {
        organizationId: ctx.organizationId,
        idempotencyKey: input.idempotencyKey,
        emailType: input.emailType,
        visitId: input.visitId ?? null,
        toEmail: input.toEmail.toLowerCase(),
        status: "pending",
      },
    });
    return true;
  } catch (error) {
    if (isPrismaKnownRequestError(error) && error.code === "P2002") {
      const existing = await prisma.emailDeliveryLog.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { status: true },
      });
      return existing?.status !== "sent";
    }
    throw error;
  }
}

async function markDeliverySent(idempotencyKey: string, retryCount: number) {
  await prisma.emailDeliveryLog.update({
    where: { idempotencyKey },
    data: {
      status: "sent",
      sentAt: new Date(),
      retryCount,
      lastError: null,
    },
  });
}

async function markDeliveryFailed(
  idempotencyKey: string,
  retryCount: number,
  error: string,
) {
  await prisma.emailDeliveryLog.update({
    where: { idempotencyKey },
    data: {
      status: "failed",
      retryCount,
      lastError: error,
    },
  });
}

async function logEmailFailure(
  ctx: TenantContext,
  input: {
    idempotencyKey: string;
    emailType: string;
    toEmail: string;
    payload: unknown;
    error: string;
    retryCount: number;
  },
) {
  await prisma.emailFailureLog.create({
    data: {
      organizationId: ctx.organizationId,
      idempotencyKey: input.idempotencyKey,
      emailType: input.emailType,
      toEmail: input.toEmail.toLowerCase(),
      payload: JSON.parse(JSON.stringify(input.payload)),
      error: input.error,
      retryCount: input.retryCount,
    },
  });
}

export async function deliverTransactionalEmailFromWorker(
  ctx: TenantContext,
  payload: TransactionalEmailPayload,
  jobRetryCount: number,
): Promise<DeliveryResult> {
  const claimed = await tryClaimDelivery(ctx, {
    idempotencyKey: payload.idempotencyKey,
    emailType: payload.type,
    toEmail: payload.to,
    visitId: payload.visit.id,
  });

  if (!claimed) {
    return { success: true };
  }

  const rendered = renderTransactionalEmail(payload);

  try {
    await deliverTransactionalEmail(rendered);
    await markDeliverySent(payload.idempotencyKey, jobRetryCount);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markDeliveryFailed(payload.idempotencyKey, jobRetryCount, message);
    await logEmailFailure(ctx, {
      idempotencyKey: payload.idempotencyKey,
      emailType: payload.type,
      toEmail: payload.to,
      payload,
      error: message,
      retryCount: jobRetryCount,
    });
    return { success: false, error: message };
  }
}

export async function deliverPlatformEmailFromWorker(
  ctx: TenantContext,
  job: PlatformEmailJob,
  jobRetryCount: number,
): Promise<DeliveryResult> {
  const claimed = await tryClaimDelivery(ctx, {
    idempotencyKey: job.idempotencyKey,
    emailType: job.type,
    toEmail: job.to,
    visitId: job.visitId ?? null,
  });

  if (!claimed) {
    return { success: true };
  }

  try {
    await deliverTransactionalEmail({
      to: job.to,
      subject: job.subject,
      html: job.html,
      text: job.text,
    });
    await markDeliverySent(job.idempotencyKey, jobRetryCount);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markDeliveryFailed(job.idempotencyKey, jobRetryCount, message);
    await logEmailFailure(ctx, {
      idempotencyKey: job.idempotencyKey,
      emailType: job.type,
      toEmail: job.to,
      payload: job,
      error: message,
      retryCount: jobRetryCount,
    });
    return { success: false, error: message };
  }
}
