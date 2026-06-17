import { rebuildSnapshotsForOrganization } from "./snapshot-engine-core";

const pendingRebuilds = new Set<string>();
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
const REBUILD_DEBOUNCE_MS = 5_000;

async function flushPendingSnapshotRebuilds() {
  const organizationIds = [...pendingRebuilds];
  pendingRebuilds.clear();
  rebuildTimer = null;

  await Promise.allSettled(
    organizationIds.map((organizationId) =>
      rebuildSnapshotsForOrganization(organizationId),
    ),
  );
}

export function triggerSnapshotRebuild(organizationId: string) {
  pendingRebuilds.add(organizationId);

  if (rebuildTimer) {
    return;
  }

  rebuildTimer = setTimeout(() => {
    void flushPendingSnapshotRebuilds();
  }, REBUILD_DEBOUNCE_MS);
}
