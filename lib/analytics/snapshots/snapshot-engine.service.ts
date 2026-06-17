import { writeAnalyticsSnapshot } from "./snapshot-writer.service";
import {
  listActiveOrganizationIds,
  rebuildSnapshotsForOrganization,
} from "./snapshot-engine-core";
import type {
  AnalyticsSnapshotPeriod,
  AnalyticsSnapshotType,
} from "./snapshot-types";
import { SNAPSHOT_PERIODS, SNAPSHOT_TYPES } from "./snapshot-types";

export { triggerSnapshotRebuild } from "./snapshot-rebuild";
export {
  listActiveOrganizationIds,
  rebuildSnapshotsForOrganization,
} from "./snapshot-engine-core";

export async function buildSnapshot(
  organizationId: string,
  type: AnalyticsSnapshotType,
  period: AnalyticsSnapshotPeriod,
) {
  return writeAnalyticsSnapshot(organizationId, type, period);
}

export async function buildAllSnapshotsForOrganization(
  organizationId: string,
) {
  for (const period of SNAPSHOT_PERIODS) {
    for (const type of SNAPSHOT_TYPES) {
      await buildSnapshot(organizationId, type, period);
    }
  }
}
