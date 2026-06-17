import { getBranch } from "@/lib/api/branches";
import { getBranchSettings, getOrganizationSettings } from "@/lib/api/settings";
import {
  resolveBranchOperationalSettings,
  type BranchOperationalSettings,
} from "@/lib/settings/branch-operational";
import { DEFAULT_BRANCH_TIMEZONE } from "@/lib/settings/branch-timezones";
import { DEFAULT_BRANCH_SETTINGS } from "@/lib/settings/defaults";
import type { BrandingConfig } from "@/lib/settings/types";
import { isWithinVisitHours } from "@/lib/server/policies/visit-hours";
import { loadBranchOptions } from "@/lib/visits/branches";

export { isWithinVisitHours };

export interface KioskOperationalSnapshot {
  byBranchId: Record<string, BranchOperationalSettings>;
  timezoneByBranchId: Record<string, string>;
  defaultOperational: BranchOperationalSettings;
  defaultTimezone: string;
  branding: BrandingConfig;
  qrCheckInEnabled: boolean;
}

export function getOperationalForBranch(
  snapshot: KioskOperationalSnapshot,
  branchId: string | null | undefined,
): BranchOperationalSettings {
  if (branchId && snapshot.byBranchId[branchId]) {
    return snapshot.byBranchId[branchId];
  }

  return snapshot.defaultOperational;
}

export function getTimezoneForBranch(
  snapshot: KioskOperationalSnapshot,
  branchId: string | null | undefined,
): string {
  if (branchId && snapshot.timezoneByBranchId[branchId]) {
    return snapshot.timezoneByBranchId[branchId];
  }

  return snapshot.defaultTimezone;
}

export function isKioskGloballyEnabled(
  snapshot: KioskOperationalSnapshot,
): boolean {
  const branchConfigs = Object.values(snapshot.byBranchId);
  if (branchConfigs.length === 0) {
    return snapshot.defaultOperational.kioskEnabled;
  }

  return branchConfigs.some((config) => config.kioskEnabled);
}

export function isWalkInAllowedOnHome(
  snapshot: KioskOperationalSnapshot,
): boolean {
  const branchConfigs = Object.values(snapshot.byBranchId);
  if (branchConfigs.length === 0) {
    return snapshot.defaultOperational.allowWalkIns;
  }

  return branchConfigs.some((config) => config.allowWalkIns);
}

export async function fetchKioskOperationalSnapshot(): Promise<KioskOperationalSnapshot> {
  const orgResult = await getOrganizationSettings();
  const orgConfig = orgResult.config;

  const defaultOperational = resolveBranchOperationalSettings({
    orgConfig,
    requiresApproval: orgConfig.visitor.requiresApproval,
    allowWalkIns: orgConfig.visitor.allowWalkIns,
    qrExpiryMinutes: DEFAULT_BRANCH_SETTINGS.qrExpiryMinutes,
    operationalSettingsJson: null,
  });

  const byBranchId: Record<string, BranchOperationalSettings> = {};
  const timezoneByBranchId: Record<string, string> = {};

  try {
    const branchOptions = await loadBranchOptions();

    await Promise.all(
      branchOptions.map(async (branch) => {
        try {
          const [settingsResult, branchResult] = await Promise.all([
            getBranchSettings(branch.id),
            getBranch(branch.id),
          ]);
          byBranchId[branch.id] = settingsResult.config.operational;
          timezoneByBranchId[branch.id] = branchResult.branch.timezone;
        } catch {
          byBranchId[branch.id] = resolveBranchOperationalSettings({
            orgConfig,
            requiresApproval:
              branch.requiresApproval ?? orgConfig.visitor.requiresApproval,
            allowWalkIns: orgConfig.visitor.allowWalkIns,
            qrExpiryMinutes: DEFAULT_BRANCH_SETTINGS.qrExpiryMinutes,
            operationalSettingsJson: null,
          });
          timezoneByBranchId[branch.id] = DEFAULT_BRANCH_TIMEZONE;
        }
      }),
    );
  } catch {
    // Visit-derived branch list unavailable — org defaults apply.
  }

  return {
    byBranchId,
    timezoneByBranchId,
    defaultOperational,
    defaultTimezone: DEFAULT_BRANCH_TIMEZONE,
    branding: orgConfig.branding,
    qrCheckInEnabled: orgConfig.checkIn.qrRequired,
  };
}
