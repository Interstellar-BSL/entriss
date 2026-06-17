import {
  buildAllSnapshotsForOrganization,
  listActiveOrganizationIds,
  rebuildSnapshotsForOrganization,
} from "./snapshot-engine.service";
import type { AnalyticsSnapshotPeriod } from "./snapshot-types";
import { SNAPSHOT_PERIODS } from "./snapshot-types";

async function runForAllOrganizations(
  periods: AnalyticsSnapshotPeriod[],
) {
  const organizationIds = await listActiveOrganizationIds();

  await Promise.allSettled(
    organizationIds.map((organizationId) =>
      rebuildSnapshotsForOrganization(organizationId, periods),
    ),
  );

  return { organizations: organizationIds.length, periods };
}

export async function generateDailySnapshots() {
  return runForAllOrganizations(["daily"]);
}

export async function generateWeeklySnapshots() {
  return runForAllOrganizations(["weekly"]);
}

export async function generateMonthlySnapshots() {
  return runForAllOrganizations(["monthly"]);
}

export async function generateAllSnapshots() {
  return runForAllOrganizations([...SNAPSHOT_PERIODS]);
}

export async function warmOrganizationSnapshots(organizationId: string) {
  await buildAllSnapshotsForOrganization(organizationId);
}
