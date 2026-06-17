import type { OrganizationSettings } from "@/app/generated/prisma/client";

import {
  normalizeApprovalSettings,
  type NormalizedApprovalSettings,
} from "./approval-normalize";
import { DEFAULT_ORGANIZATION_SETTINGS } from "./defaults";
import type { ResolvedBranchConfig, ResolvedOrganizationConfig } from "./types";

export type SerializedOrganizationSettingsRecord = {
  id: string;
  organizationId: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  welcomeMessage: string | null;
  themeMode: string;
  requiresApproval: boolean;
  allowWalkIns: boolean;
  capturePhoto: boolean;
  requireIDUpload: boolean;
  qrRequired: boolean;
  manualOverrideAllowed: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export interface SerializedOrganizationSettingsPayload {
  settings: SerializedOrganizationSettingsRecord;
  config: ResolvedOrganizationConfig;
  approval: NormalizedApprovalSettings;
}

export interface SerializedBranchSettingsPayload {
  settings: {
    id: string;
    branchId: string;
    organizationId: string;
    requiresApproval: boolean;
    autoCheckoutHours: number | null;
    qrExpiryMinutes: number;
    badgeTemplate: string;
    allowWalkIns: boolean;
    operationalSettings: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  };
  config: ResolvedBranchConfig;
  approval: NormalizedApprovalSettings;
}

export function serializeOrganizationSettingsRecord(
  settings: OrganizationSettings,
): SerializedOrganizationSettingsRecord {
  const approval = normalizeApprovalSettings(settings);

  return {
    ...settings,
    requiresApproval: approval.requireApproval.enabled,
  };
}

export function buildOrganizationSettingsPayload(
  settings: OrganizationSettings,
  config: ResolvedOrganizationConfig,
): SerializedOrganizationSettingsPayload {
  return {
    settings: serializeOrganizationSettingsRecord(settings),
    config,
    approval: normalizeApprovalSettings(settings),
  };
}

export function buildBranchSettingsPayload(
  settings: SerializedBranchSettingsPayload["settings"],
  config: ResolvedBranchConfig,
): SerializedBranchSettingsPayload {
  return {
    settings,
    config,
    approval: normalizeApprovalSettings({
      requiresApproval: config.visitor.requiresApproval,
    }),
  };
}

export function buildDefaultOrganizationSettingsPayload(
  organizationId: string,
): SerializedOrganizationSettingsPayload {
  const now = new Date();
  const defaults = DEFAULT_ORGANIZATION_SETTINGS;
  const approval = normalizeApprovalSettings(defaults);

  const settings: SerializedOrganizationSettingsRecord = {
    id: "default",
    organizationId,
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
  };

  const config: ResolvedOrganizationConfig = {
    organizationId,
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

  return { settings, config, approval };
}
