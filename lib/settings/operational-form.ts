import type { BranchOperationalSettings } from "@/lib/settings/branch-operational";
import type { BranchOperationalSettingsPatchInput } from "@/lib/validations/branch-operational-settings";

export const OPERATIONAL_SETTING_KEYS: Array<keyof BranchOperationalSettings> = [
  "requireApproval",
  "allowWalkIns",
  "kioskEnabled",
  "autoCheckInApprovedVisitors",
  "requireVisitorPhoto",
  "requireVisitorDocuments",
  "badgePrintingEnabled",
  "qrExpiryHours",
  "allowedVisitStartHour",
  "allowedVisitEndHour",
];

export function operationalSettingsEqual(
  a: BranchOperationalSettings,
  b: BranchOperationalSettings,
): boolean {
  return OPERATIONAL_SETTING_KEYS.every((key) => a[key] === b[key]);
}

export function buildOperationalPatch(
  saved: BranchOperationalSettings,
  current: BranchOperationalSettings,
): BranchOperationalSettingsPatchInput | null {
  const patch: BranchOperationalSettingsPatchInput = {};

  for (const key of OPERATIONAL_SETTING_KEYS) {
    if (saved[key] !== current[key]) {
      (patch as Record<string, unknown>)[key] = current[key];
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
