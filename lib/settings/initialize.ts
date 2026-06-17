import type { DbExecutor } from "@/lib/db/transaction";

import { DEFAULT_BRANCH_SETTINGS, DEFAULT_ORGANIZATION_SETTINGS } from "./defaults";
import { DEFAULT_FEATURE_FLAG_DEFINITIONS } from "./feature-flags";

export async function initializeOrganizationSettingsRecord(
  db: DbExecutor,
  organizationId: string,
  options?: { logoUrl?: string | null },
) {
  const settings = await db.organizationSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      logoUrl: options?.logoUrl ?? null,
      ...DEFAULT_ORGANIZATION_SETTINGS,
    },
    update: {},
  });

  for (const flag of DEFAULT_FEATURE_FLAG_DEFINITIONS) {
    await db.featureFlag.upsert({
      where: {
        organizationId_key: {
          organizationId,
          key: flag.key,
        },
      },
      create: {
        organizationId,
        key: flag.key,
        value: flag.value,
        description: flag.description,
      },
      update: {},
    });
  }

  return settings;
}

export async function initializeBranchSettingsRecord(
  db: DbExecutor,
  organizationId: string,
  branchId: string,
  legacy?: {
    requiresApproval?: boolean;
    autoCheckoutHours?: number | null;
  },
) {
  return db.branchSettings.upsert({
    where: { branchId },
    create: {
      branchId,
      organizationId,
      requiresApproval:
        legacy?.requiresApproval ?? DEFAULT_BRANCH_SETTINGS.requiresApproval,
      autoCheckoutHours:
        legacy?.autoCheckoutHours ?? DEFAULT_BRANCH_SETTINGS.autoCheckoutHours,
      qrExpiryMinutes: DEFAULT_BRANCH_SETTINGS.qrExpiryMinutes,
      badgeTemplate: DEFAULT_BRANCH_SETTINGS.badgeTemplate,
      allowWalkIns: DEFAULT_BRANCH_SETTINGS.allowWalkIns,
      operationalSettings: {},
    },
    update: {},
  });
}
