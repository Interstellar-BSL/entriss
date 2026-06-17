import type { BadgeTemplateType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/db/client";
import { isPrismaKnownRequestError } from "@/lib/db/prisma-errors";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { normalizeOrgThemeMode } from "@/lib/branding/resolve";

import { normalizeVisitorApprovalFields } from "./approval-normalize";
import { resolveBranchOperationalSettings } from "./branch-operational";
import { DEFAULT_BRANCH_SETTINGS, DEFAULT_ORGANIZATION_SETTINGS } from "./defaults";
import {
  FEATURE_FLAGS,
  type FeatureFlagKey,
} from "./feature-flags";
import { deepMerge } from "./merge";
import type {
  CheckInConfig,
  NotificationConfig,
  ResolvedBranchConfig,
  ResolvedOrganizationConfig,
  VisitorConfig,
} from "./types";

function parseFeatureFlags(
  flags: Array<{ key: string; value: unknown }>,
): Record<string, boolean | string | unknown> {
  const map: Record<string, boolean | string | unknown> = {};

  for (const flag of flags) {
    map[flag.key] = flag.value;
  }

  return map;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

function applyFeatureFlagOverrides(
  config: ResolvedOrganizationConfig,
): ResolvedOrganizationConfig {
  const features = config.features;

  const smsFlag = features[FEATURE_FLAGS.ENABLE_SMS_NOTIFICATIONS];
  const photoFlag = features[FEATURE_FLAGS.ENABLE_PHOTO_CAPTURE];

  return {
    ...config,
    notifications: {
      ...config.notifications,
      smsEnabled: coerceBoolean(smsFlag, config.notifications.smsEnabled),
    },
    visitor: {
      ...config.visitor,
      capturePhoto: coerceBoolean(photoFlag, config.visitor.capturePhoto),
    },
  };
}

function mapOrganizationSettings(
  organizationId: string,
  settings: {
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    welcomeMessage: string | null;
    themeMode?: string | null;
    requiresApproval: boolean;
    allowWalkIns: boolean;
    capturePhoto: boolean;
    requireIDUpload: boolean;
    qrRequired: boolean;
    manualOverrideAllowed: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
  } | null,
  orgLogoUrl: string | null,
  features: Record<string, boolean | string | unknown>,
): ResolvedOrganizationConfig {
  const base: ResolvedOrganizationConfig = {
    organizationId,
    branding: {
      logoUrl: settings?.logoUrl ?? orgLogoUrl ?? null,
      primaryColor: settings?.primaryColor ?? DEFAULT_ORGANIZATION_SETTINGS.primaryColor,
      secondaryColor:
        settings?.secondaryColor ?? DEFAULT_ORGANIZATION_SETTINGS.secondaryColor,
      welcomeMessage: settings?.welcomeMessage ?? null,
      themeMode: normalizeOrgThemeMode(
        settings?.themeMode ?? DEFAULT_ORGANIZATION_SETTINGS.themeMode,
      ),
    },
    visitor: {
      ...normalizeVisitorApprovalFields(settings),
      allowWalkIns:
        settings?.allowWalkIns ?? DEFAULT_ORGANIZATION_SETTINGS.allowWalkIns,
      capturePhoto:
        settings?.capturePhoto ?? DEFAULT_ORGANIZATION_SETTINGS.capturePhoto,
      requireIDUpload:
        settings?.requireIDUpload ?? DEFAULT_ORGANIZATION_SETTINGS.requireIDUpload,
    },
    checkIn: {
      qrRequired: settings?.qrRequired ?? DEFAULT_ORGANIZATION_SETTINGS.qrRequired,
      manualOverrideAllowed:
        settings?.manualOverrideAllowed ??
        DEFAULT_ORGANIZATION_SETTINGS.manualOverrideAllowed,
    },
    notifications: {
      emailEnabled:
        settings?.emailEnabled ?? DEFAULT_ORGANIZATION_SETTINGS.emailEnabled,
      smsEnabled: settings?.smsEnabled ?? DEFAULT_ORGANIZATION_SETTINGS.smsEnabled,
    },
    features,
  };

  return applyFeatureFlagOverrides(base);
}

export async function resolveOrganizationConfig(
  ctx: TenantContext,
): Promise<ResolvedOrganizationConfig> {
  try {
    const organization = await prisma.organization.findFirst({
      where: {
        id: ctx.organizationId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        organizationSettings: true,
        featureFlags: true,
      },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    const features = parseFeatureFlags(organization.featureFlags);

    return mapOrganizationSettings(
      organization.id,
      organization.organizationSettings,
      organization.logoUrl,
      features,
    );
  } catch (err) {
    if (isPrismaKnownRequestError(err) && err.code === "P2022") {
      return mapOrganizationSettings(ctx.organizationId, null, null, {});
    }
    throw err;
  }
}

export async function resolveBranchConfig(
  ctx: TenantContext,
  branchId: string,
): Promise<ResolvedBranchConfig> {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      organizationId: ctx.organizationId,
      isActive: true,
      deletedAt: null,
    },
    include: {
      branchSettings: true,
    },
  });

  if (!branch) {
    throw new Error(`Branch not found: ${branchId}`);
  }

  const orgConfig = await resolveOrganizationConfig(ctx);
  const branchSettings = branch.branchSettings;

  const branchOverrides: Partial<ResolvedBranchConfig> = {
    branchId: branch.id,
    requiresApproval:
      branchSettings?.requiresApproval ??
      branch.requiresApproval ??
      DEFAULT_BRANCH_SETTINGS.requiresApproval,
    autoCheckoutHours:
      branchSettings?.autoCheckoutHours ??
      branch.autoCheckoutHours ??
      DEFAULT_BRANCH_SETTINGS.autoCheckoutHours,
    qrExpiryMinutes:
      branchSettings?.qrExpiryMinutes ?? DEFAULT_BRANCH_SETTINGS.qrExpiryMinutes,
    badgeTemplate:
      (branchSettings?.badgeTemplate as BadgeTemplateType | undefined) ??
      DEFAULT_BRANCH_SETTINGS.badgeTemplate,
    allowWalkIns:
      branchSettings?.allowWalkIns ?? DEFAULT_BRANCH_SETTINGS.allowWalkIns,
    visitor: deepMerge(
      orgConfig.visitor as unknown as Record<string, unknown>,
      {
        requiresApproval:
          branchSettings?.requiresApproval ??
          branch.requiresApproval ??
          orgConfig.visitor.requiresApproval,
        allowWalkIns:
          branchSettings?.allowWalkIns ?? orgConfig.visitor.allowWalkIns,
      },
    ) as unknown as VisitorConfig,
  };

  const merged = deepMerge(
    orgConfig as unknown as Record<string, unknown>,
    branchOverrides as unknown as Record<string, unknown>,
  ) as unknown as ResolvedBranchConfig;

  merged.branchId = branch.id;
  merged.requiresApproval = branchOverrides.requiresApproval!;
  merged.autoCheckoutHours = branchOverrides.autoCheckoutHours ?? null;
  merged.qrExpiryMinutes = branchOverrides.qrExpiryMinutes!;
  merged.badgeTemplate = branchOverrides.badgeTemplate!;
  merged.allowWalkIns = branchOverrides.allowWalkIns!;

  const withFlags = applyFeatureFlagOverrides(merged) as ResolvedBranchConfig;

  withFlags.operational = resolveBranchOperationalSettings({
    orgConfig: withFlags,
    requiresApproval: withFlags.requiresApproval,
    allowWalkIns: withFlags.allowWalkIns,
    qrExpiryMinutes: withFlags.qrExpiryMinutes,
    operationalSettingsJson: branchSettings?.operationalSettings ?? null,
  });

  return withFlags;
}

export async function isFeatureEnabledForOrg(
  organizationId: string,
  key: FeatureFlagKey,
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: {
      organizationId_key: {
        organizationId,
        key,
      },
    },
  });

  if (!flag) {
    return false;
  }

  return coerceBoolean(flag.value, false);
}
