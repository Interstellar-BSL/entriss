import { prisma } from "@/lib/db/client";

import { writeAllSnapshotsForOrganization } from "./snapshot-writer.service";
import type { AnalyticsSnapshotPeriod } from "./snapshot-types";
import { SNAPSHOT_PERIODS } from "./snapshot-types";

export async function listActiveOrganizationIds() {
  const organizations = await prisma.organization.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true },
  });

  return organizations.map((organization) => organization.id);
}

export async function rebuildSnapshotsForOrganization(
  organizationId: string,
  periods: AnalyticsSnapshotPeriod[] = [...SNAPSHOT_PERIODS],
) {
  await writeAllSnapshotsForOrganization(organizationId, periods);
}
