import type {
  CreateNotificationJobInput,
  NotificationJobRecord,
} from "./job-types";

export interface INotificationQueue {
  enqueue(input: CreateNotificationJobInput): Promise<string | null>;
  process(): Promise<void>;
  retry(jobId: string): Promise<void>;
  moveToDLQ(jobId: string, error: string): Promise<void>;
  resumePendingJobs(): Promise<void>;
  getJob(jobId: string): Promise<NotificationJobRecord | null>;
}
