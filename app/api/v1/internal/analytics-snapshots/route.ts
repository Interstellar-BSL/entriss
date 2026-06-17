import { error, success } from "@/lib/api/response";
import {
  generateAllSnapshots,
  generateDailySnapshots,
  generateMonthlySnapshots,
  generateWeeklySnapshots,
} from "@/lib/analytics/snapshots/snapshot-scheduler.service";

type SnapshotJob = "daily" | "weekly" | "monthly" | "all";

function authorizeCron(request: Request) {
  const secret = process.env.ANALYTICS_SNAPSHOT_CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return error("UNAUTHORIZED", "Invalid snapshot scheduler credentials", 401);
  }

  let job: SnapshotJob = "all";

  try {
    const body = (await request.json()) as { job?: SnapshotJob };
    if (body.job) {
      job = body.job;
    }
  } catch {
    // Default to all snapshot jobs when body is omitted.
  }

  const result =
    job === "daily"
      ? await generateDailySnapshots()
      : job === "weekly"
        ? await generateWeeklySnapshots()
        : job === "monthly"
          ? await generateMonthlySnapshots()
          : await generateAllSnapshots();

  return success({ job, ...result });
}
