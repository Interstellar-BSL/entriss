type AsyncNotificationJob = () => Promise<void>;

const pendingJobs: AsyncNotificationJob[] = [];
let draining = false;

async function drainAsyncJobs() {
  if (draining) {
    return;
  }

  draining = true;

  while (pendingJobs.length > 0) {
    const job = pendingJobs.shift();
    if (!job) {
      continue;
    }

    try {
      await job();
    } catch (error) {
      console.error("[notifications] async job failed", error);
    }
  }

  draining = false;
}

/** Lightweight non-blocking runner for notification projection (pre-queue). */
export function enqueueNotificationJob(job: AsyncNotificationJob) {
  pendingJobs.push(job);
  setImmediate(() => {
    void drainAsyncJobs();
  });
}
