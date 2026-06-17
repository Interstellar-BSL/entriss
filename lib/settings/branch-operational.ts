import type { ResolvedOrganizationConfig } from "./types";

/**
 * Normalized branch operational policies — always fully resolved (no undefined fields).
 * Consumed by resolveBranchConfig() for future flow behavior; not enforced yet.
 */
export interface BranchOperationalSettings {
  requireApproval: boolean;
  allowWalkIns: boolean;
  kioskEnabled: boolean;
  autoCheckInApprovedVisitors: boolean;
  requireVisitorPhoto: boolean;
  requireVisitorDocuments: boolean;
  badgePrintingEnabled: boolean;
  qrExpiryHours: number;
  allowedVisitStartHour: string;
  allowedVisitEndHour: string;
}

/** Fields stored in BranchSettings.operationalSettings JSON (branch-specific overrides). */
export type BranchOperationalSettingsJson = Pick<
  BranchOperationalSettings,
  | "kioskEnabled"
  | "autoCheckInApprovedVisitors"
  | "requireVisitorPhoto"
  | "requireVisitorDocuments"
  | "badgePrintingEnabled"
  | "allowedVisitStartHour"
  | "allowedVisitEndHour"
>;

export const DEFAULT_BRANCH_OPERATIONAL_SETTINGS: BranchOperationalSettings = {
  requireApproval: true,
  allowWalkIns: true,
  kioskEnabled: true,
  autoCheckInApprovedVisitors: false,
  requireVisitorPhoto: false,
  requireVisitorDocuments: false,
  badgePrintingEnabled: true,
  qrExpiryHours: 24,
  allowedVisitStartHour: "08:00",
  allowedVisitEndHour: "18:00",
};

const JSON_KEYS: Array<keyof BranchOperationalSettingsJson> = [
  "kioskEnabled",
  "autoCheckInApprovedVisitors",
  "requireVisitorPhoto",
  "requireVisitorDocuments",
  "badgePrintingEnabled",
  "allowedVisitStartHour",
  "allowedVisitEndHour",
];

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

function coerceString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

/**
 * Safely parse persisted JSON partial operational overrides.
 */
export function parseBranchOperationalSettingsJson(
  value: unknown,
): Partial<BranchOperationalSettingsJson> {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  const result: Partial<BranchOperationalSettingsJson> = {};

  for (const key of JSON_KEYS) {
    const entry = raw[key];
    if (entry === undefined) {
      continue;
    }

    if (key === "allowedVisitStartHour" || key === "allowedVisitEndHour") {
      if (typeof entry === "string") {
        result[key] = entry.trim();
      }
      continue;
    }

    if (typeof entry === "boolean") {
      result[key] = entry;
    }
  }

  return result;
}

export function qrExpiryMinutesToHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return DEFAULT_BRANCH_OPERATIONAL_SETTINGS.qrExpiryHours;
  }
  return Math.max(1, Math.round(minutes / 60));
}

export function qrExpiryHoursToMinutes(hours: number): number {
  return Math.max(15, Math.round(hours * 60));
}

export interface ResolveBranchOperationalInput {
  orgConfig: ResolvedOrganizationConfig;
  requiresApproval: boolean;
  allowWalkIns: boolean;
  qrExpiryMinutes: number;
  operationalSettingsJson: unknown;
}

/**
 * Merge defaults, org context, persisted columns, and JSON overrides into a
 * complete operational settings object.
 */
export function resolveBranchOperationalSettings(
  input: ResolveBranchOperationalInput,
): BranchOperationalSettings {
  const jsonOverrides = parseBranchOperationalSettingsJson(
    input.operationalSettingsJson,
  );

  const orgPhotoDefault = input.orgConfig.visitor.capturePhoto;
  const orgDocumentsDefault = input.orgConfig.visitor.requireIDUpload;

  return {
    requireApproval: input.requiresApproval,
    allowWalkIns: input.allowWalkIns,
    kioskEnabled: coerceBoolean(
      jsonOverrides.kioskEnabled,
      DEFAULT_BRANCH_OPERATIONAL_SETTINGS.kioskEnabled,
    ),
    autoCheckInApprovedVisitors: coerceBoolean(
      jsonOverrides.autoCheckInApprovedVisitors,
      DEFAULT_BRANCH_OPERATIONAL_SETTINGS.autoCheckInApprovedVisitors,
    ),
    requireVisitorPhoto: coerceBoolean(
      jsonOverrides.requireVisitorPhoto ?? orgPhotoDefault,
      orgPhotoDefault ?? DEFAULT_BRANCH_OPERATIONAL_SETTINGS.requireVisitorPhoto,
    ),
    requireVisitorDocuments: coerceBoolean(
      jsonOverrides.requireVisitorDocuments ?? orgDocumentsDefault,
      orgDocumentsDefault ??
        DEFAULT_BRANCH_OPERATIONAL_SETTINGS.requireVisitorDocuments,
    ),
    badgePrintingEnabled: coerceBoolean(
      jsonOverrides.badgePrintingEnabled,
      DEFAULT_BRANCH_OPERATIONAL_SETTINGS.badgePrintingEnabled,
    ),
    qrExpiryHours: qrExpiryMinutesToHours(input.qrExpiryMinutes),
    allowedVisitStartHour: coerceString(
      jsonOverrides.allowedVisitStartHour,
      DEFAULT_BRANCH_OPERATIONAL_SETTINGS.allowedVisitStartHour,
    ),
    allowedVisitEndHour: coerceString(
      jsonOverrides.allowedVisitEndHour,
      DEFAULT_BRANCH_OPERATIONAL_SETTINGS.allowedVisitEndHour,
    ),
  };
}

/**
 * Extract JSON-storable overrides from a partial operational patch.
 */
export function pickOperationalJsonOverrides(
  input: Partial<BranchOperationalSettings>,
): Partial<BranchOperationalSettingsJson> {
  const result: Partial<BranchOperationalSettingsJson> = {};

  for (const key of JSON_KEYS) {
    const value = input[key];
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

/**
 * Merge existing JSON with new overrides (shallow per-key).
 */
export function mergeOperationalSettingsJson(
  existing: unknown,
  patch: Partial<BranchOperationalSettingsJson>,
): Partial<BranchOperationalSettingsJson> {
  const base = parseBranchOperationalSettingsJson(existing);
  return { ...base, ...patch };
}
