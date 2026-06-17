import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";
import { isPrismaKnownRequestError } from "@/lib/db/prisma-errors";

import { processNotificationJob } from "../worker/notification.worker";
import type {
  CreateNotificationJobInput,
  NotificationChannelType,
  NotificationJobPayload,
  NotificationJobRecord,
  NotificationJobStatus,
} from "./job-types";
import type { INotificationQueue } from "./notification-queue.interface";
import { DEFAULT_MAX_RETRIES, nextRetryDate } from "./retry";

function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseChannelTypes(value: unknown): NotificationChannelType[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is NotificationChannelType =>
      entry === "in-app" || entry === "email" || entry === "webhook",
  );
}

function parseRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function mapRowToRecord(row: {
  id: string;
  organizationId: string;
  eventType: string;
  channelTypes: unknown;
  recipients: unknown;
  payload: unknown;
  status: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;
  lastError: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}): NotificationJobRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    eventType: row.eventType,
    channelTypes: parseChannelTypes(row.channelTypes),
    recipients: parseRecipients(row.recipients),
    payload: row.payload as NotificationJobPayload,
    status: row.status as NotificationJobStatus,
    retryCount: row.retryCount,
    maxRetries: row.maxRetries,
    nextRetryAt: row.nextRetryAt,
    lastError: row.lastError,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

class InMemoryNotificationQueue implements INotificationQueue {
  private draining = false;
  private pendingJobIds = new Set<string>();
  private retryTimers = new Map<string, NodeJS.Timeout>();

  async enqueue(input: CreateNotificationJobInput): Promise<string | null> {
    try {
      const job = await prisma.notificationJob.create({
        data: {
          organizationId: input.organizationId,
          eventType: input.eventType,
          channelTypes: input.channelTypes,
          recipients: input.recipients,
          payload: toJsonValue(input.payload),
          status: "PENDING",
          maxRetries: input.maxRetries ?? DEFAULT_MAX_RETRIES,
          idempotencyKey: input.idempotencyKey,
        },
      });

      this.pendingJobIds.add(job.id);
      this.scheduleProcess();
      return job.id;
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === "P2002") {
        const existing = await prisma.notificationJob.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { id: true, status: true },
        });

        if (
          existing &&
          (existing.status === "PENDING" ||
            existing.status === "RETRYING" ||
            existing.status === "PROCESSING")
        ) {
          this.pendingJobIds.add(existing.id);
          this.scheduleProcess();
        }

        return existing?.id ?? null;
      }

      throw error;
    }
  }

  async getJob(jobId: string): Promise<NotificationJobRecord | null> {
    const row = await prisma.notificationJob.findUnique({ where: { id: jobId } });
    return row ? mapRowToRecord(row) : null;
  }

  async process(): Promise<void> {
    if (this.draining) {
      return;
    }

    this.draining = true;

    try {
      while (this.pendingJobIds.size > 0) {
        const jobId = this.pendingJobIds.values().next().value;
        if (!jobId) {
          break;
        }

        this.pendingJobIds.delete(jobId);
        await this.processJob(jobId);
      }
    } finally {
      this.draining = false;
    }
  }

  async retry(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      return;
    }

    const nextAttempt = job.retryCount + 1;
    const retryAt = nextRetryDate(nextAttempt);

    await prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: "RETRYING",
        retryCount: nextAttempt,
        nextRetryAt: retryAt,
      },
    });

    const delayMs = Math.max(0, retryAt.getTime() - Date.now());
    const existingTimer = this.retryTimers.get(jobId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.retryTimers.delete(jobId);
      this.pendingJobIds.add(jobId);
      this.scheduleProcess();
    }, delayMs);

    this.retryTimers.set(jobId, timer);
  }

  async moveToDLQ(jobId: string, error: string): Promise<void> {
    const job = await prisma.notificationJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return;
    }

    await prisma.$transaction([
      prisma.notificationDlq.upsert({
        where: { jobId },
        create: {
          jobId: job.id,
          organizationId: job.organizationId,
          eventType: job.eventType,
          channelTypes: toJsonValue(job.channelTypes),
          recipients: toJsonValue(job.recipients),
          payload: toJsonValue(job.payload),
          retryCount: job.retryCount,
          lastError: error,
        },
        update: {
          retryCount: job.retryCount,
          lastError: error,
          failedAt: new Date(),
        },
      }),
      prisma.notificationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          lastError: error,
        },
      }),
    ]);
  }

  async resumePendingJobs(): Promise<void> {
    const now = new Date();
    const jobs = await prisma.notificationJob.findMany({
      where: {
        OR: [
          { status: "PENDING" },
          {
            status: "RETRYING",
            OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
          },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    for (const job of jobs) {
      this.pendingJobIds.add(job.id);
    }

    if (jobs.length > 0) {
      this.scheduleProcess();
    }
  }

  private scheduleProcess() {
    setImmediate(() => {
      void this.process();
    });
  }

  private async processJob(jobId: string) {
    const job = await this.getJob(jobId);
    if (!job) {
      return;
    }

    if (job.status === "DELIVERED" || job.status === "FAILED") {
      return;
    }

    if (
      job.status === "RETRYING" &&
      job.nextRetryAt &&
      job.nextRetryAt.getTime() > Date.now()
    ) {
      this.pendingJobIds.add(jobId);
      return;
    }

    await prisma.notificationJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", lastError: null },
    });

    try {
      await processNotificationJob(job);
      await prisma.notificationJob.update({
        where: { id: jobId },
        data: {
          status: "DELIVERED",
          nextRetryAt: null,
          lastError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[notification-worker] job failed", {
        jobId,
        eventType: job.eventType,
        error: message,
      });

      await prisma.notificationJob.update({
        where: { id: jobId },
        data: { lastError: message },
      });

      if (job.retryCount + 1 >= job.maxRetries) {
        await this.moveToDLQ(jobId, message);
        return;
      }

      await this.retry(jobId);
    }
  }
}

let queueInstance: InMemoryNotificationQueue | null = null;

export function getNotificationQueue(): INotificationQueue {
  if (!queueInstance) {
    queueInstance = new InMemoryNotificationQueue();
  }

  return queueInstance;
}

export async function startNotificationEngine() {
  const queue = getNotificationQueue();
  await queue.resumePendingJobs();
}
