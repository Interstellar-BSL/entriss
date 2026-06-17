import { normalizeApprovalSettings } from "@/lib/settings/approval-normalize";
import { DEFAULT_BRANCH_SETTINGS, DEFAULT_ORGANIZATION_SETTINGS } from "@/lib/settings/defaults";
import { resolveBranchOperationalSettings } from "@/lib/settings/branch-operational";
import type {
  ResolvedBranchConfig,
  ResolvedOrganizationConfig,
} from "@/lib/settings/types";
import type { BadgeTemplateType } from "@/app/generated/prisma/enums";

import type {
  BranchSettingsResponse,
  OrganizationSettingsResponse,
} from "./settings";

function defaultOrganizationConfig(): ResolvedOrganizationConfig {
  const defaults = DEFAULT_ORGANIZATION_SETTINGS;
  const approval = normalizeApprovalSettings(defaults);

  return {
    organizationId: "unknown",
    branding: {
      logoUrl: null,
      primaryColor: defaults.primaryColor,
      secondaryColor: defaults.secondaryColor,
      welcomeMessage: defaults.welcomeMessage,
      themeMode: defaults.themeMode,
    },
    visitor: {
      requiresApproval: approval.requireApproval.enabled,
      allowWalkIns: defaults.allowWalkIns,
      capturePhoto: defaults.capturePhoto,
      requireIDUpload: defaults.requireIDUpload,
    },
    checkIn: {
      qrRequired: defaults.qrRequired,
      manualOverrideAllowed: defaults.manualOverrideAllowed,
    },
    notifications: {
      emailEnabled: defaults.emailEnabled,
      smsEnabled: defaults.smsEnabled,
    },
    features: {},
  };
}

export function buildFallbackOrganizationSettingsResponse(): OrganizationSettingsResponse {
  const now = new Date().toISOString();
  const defaults = DEFAULT_ORGANIZATION_SETTINGS;
  const approval = normalizeApprovalSettings(defaults);
  const config = defaultOrganizationConfig();

  return {
    settings: {
      id: "fallback",
      organizationId: "unknown",
      logoUrl: null,
      primaryColor: defaults.primaryColor,
      secondaryColor: defaults.secondaryColor,
      welcomeMessage: defaults.welcomeMessage,
      themeMode: defaults.themeMode,
      requiresApproval: approval.requireApproval.enabled,
      allowWalkIns: defaults.allowWalkIns,
      capturePhoto: defaults.capturePhoto,
      requireIDUpload: defaults.requireIDUpload,
      qrRequired: defaults.qrRequired,
      manualOverrideAllowed: defaults.manualOverrideAllowed,
      emailEnabled: defaults.emailEnabled,
      smsEnabled: defaults.smsEnabled,
      createdAt: now,
      updatedAt: now,
    },
    config,
    approval,
  };
}

export function buildFallbackBranchSettingsResponse(
  branchId: string,
): BranchSettingsResponse {
  const now = new Date().toISOString();
  const orgDefaults = DEFAULT_ORGANIZATION_SETTINGS;
  const branchDefaults = DEFAULT_BRANCH_SETTINGS;
  const approval = normalizeApprovalSettings(orgDefaults);

  const config: ResolvedBranchConfig = {
    ...defaultOrganizationConfig(),
    branchId,
    requiresApproval: branchDefaults.requiresApproval,
    autoCheckoutHours: branchDefaults.autoCheckoutHours,
    qrExpiryMinutes: branchDefaults.qrExpiryMinutes,
    badgeTemplate: branchDefaults.badgeTemplate as BadgeTemplateType,
    allowWalkIns: branchDefaults.allowWalkIns,
    operational: resolveBranchOperationalSettings({
      orgConfig: defaultOrganizationConfig(),
      requiresApproval: branchDefaults.requiresApproval,
      allowWalkIns: branchDefaults.allowWalkIns,
      qrExpiryMinutes: branchDefaults.qrExpiryMinutes,
      operationalSettingsJson: null,
    }),
  };

  return {
    settings: {
      id: "fallback",
      branchId,
      organizationId: "unknown",
      requiresApproval: branchDefaults.requiresApproval,
      autoCheckoutHours: branchDefaults.autoCheckoutHours,
      qrExpiryMinutes: branchDefaults.qrExpiryMinutes,
      badgeTemplate: branchDefaults.badgeTemplate,
      allowWalkIns: branchDefaults.allowWalkIns,
      operationalSettings: null,
      createdAt: now,
      updatedAt: now,
    },
    config,
    approval,
  };
}

export function isOrganizationSettingsResponse(
  value: unknown,
): value is OrganizationSettingsResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as OrganizationSettingsResponse;
  return (
    Boolean(record.settings) &&
    Boolean(record.config) &&
    Boolean(record.approval?.requireApproval)
  );
}

export function isBranchSettingsResponse(
  value: unknown,
): value is BranchSettingsResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as BranchSettingsResponse;
  return (
    Boolean(record.settings) &&
    Boolean(record.config?.operational) &&
    Boolean(record.approval?.requireApproval)
  );
}
