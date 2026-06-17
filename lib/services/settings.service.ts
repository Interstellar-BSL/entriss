import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { enforceUserManagement } from "@/lib/rbac/enforce";
import {
  mergeOperationalSettingsJson,
  pickOperationalJsonOverrides,
  qrExpiryHoursToMinutes,
} from "@/lib/settings/branch-operational";
import {
  initializeBranchSettingsRecord,
  initializeOrganizationSettingsRecord,
} from "@/lib/settings/initialize";
import {
  isFeatureEnabledForOrg,
  resolveBranchConfig,
  resolveOrganizationConfig,
} from "@/lib/settings/resolver";
import {
  buildBranchSettingsPayload,
  buildDefaultOrganizationSettingsPayload,
  buildOrganizationSettingsPayload,
} from "@/lib/settings/serialize";
import { isPrismaKnownRequestError } from "@/lib/db/prisma-errors";
import type { FeatureFlagKey } from "@/lib/settings/feature-flags";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import {
  setFeatureFlagSchema,
  updateBranchSettingsSchema,
  updateOrganizationSettingsSchema,
  type SetFeatureFlagInput,
  type UpdateBranchSettingsInput,
  type UpdateOrganizationSettingsInput,
} from "@/lib/validations/settings";

import { BranchNotFoundError, ServiceError } from "./errors";

// ---------------------------------------------------------------------------
// Organization settings
// ---------------------------------------------------------------------------

export async function getOrganizationSettings(ctx: TenantContext) {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  try {
    await ensureOrganizationSettings(ctx);
  } catch (err) {
    if (!isSchemaDriftError(err)) {
      throw err;
    }
  }

  try {
    const [settings, config] = await Promise.all([
      prisma.organizationSettings.findUnique({
        where: { organizationId: ctx.organizationId },
      }),
      resolveOrganizationConfig(ctx),
    ]);

    if (!settings) {
      return buildDefaultOrganizationSettingsPayload(ctx.organizationId);
    }

    return buildOrganizationSettingsPayload(settings, config);
  } catch (err) {
    if (isSchemaDriftError(err)) {
      return buildDefaultOrganizationSettingsPayload(ctx.organizationId);
    }
    throw err;
  }
}

export async function updateOrganizationSettings(
  ctx: TenantContext,
  input: UpdateOrganizationSettingsInput,
) {
  enforceUserManagement(ctx);

  const data = updateOrganizationSettingsSchema.parse(input);
  await ensureOrganizationSettings(ctx);

  const updateData: Prisma.OrganizationSettingsUpdateInput = {};

  if (data.branding) {
    if (data.branding.logoUrl !== undefined) {
      updateData.logoUrl = data.branding.logoUrl;
    }
    if (data.branding.primaryColor !== undefined) {
      updateData.primaryColor = data.branding.primaryColor;
    }
    if (data.branding.secondaryColor !== undefined) {
      updateData.secondaryColor = data.branding.secondaryColor;
    }
    if (data.branding.welcomeMessage !== undefined) {
      updateData.welcomeMessage = data.branding.welcomeMessage;
    }
    if (data.branding.themeMode !== undefined) {
      updateData.themeMode = data.branding.themeMode;
    }
  }

  if (data.visitor) {
    if (data.visitor.requiresApproval !== undefined) {
      updateData.requiresApproval = data.visitor.requiresApproval;
    }
    if (data.visitor.allowWalkIns !== undefined) {
      updateData.allowWalkIns = data.visitor.allowWalkIns;
    }
    if (data.visitor.capturePhoto !== undefined) {
      updateData.capturePhoto = data.visitor.capturePhoto;
    }
    if (data.visitor.requireIDUpload !== undefined) {
      updateData.requireIDUpload = data.visitor.requireIDUpload;
    }
  }

  if (data.checkIn) {
    if (data.checkIn.qrRequired !== undefined) {
      updateData.qrRequired = data.checkIn.qrRequired;
    }
    if (data.checkIn.manualOverrideAllowed !== undefined) {
      updateData.manualOverrideAllowed = data.checkIn.manualOverrideAllowed;
    }
  }

  if (data.notifications) {
    if (data.notifications.emailEnabled !== undefined) {
      updateData.emailEnabled = data.notifications.emailEnabled;
    }
    if (data.notifications.smsEnabled !== undefined) {
      updateData.smsEnabled = data.notifications.smsEnabled;
    }
  }

  const settings = await prisma.organizationSettings.update({
    where: { organizationId: ctx.organizationId },
    data: updateData,
  });

  if (data.branding?.logoUrl !== undefined) {
    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { logoUrl: data.branding.logoUrl },
    });
  }

  const config = await resolveOrganizationConfig(ctx);
  return buildOrganizationSettingsPayload(settings, config);
}

export async function initializeOrganizationSettings(
  ctx: TenantContext,
  organizationId: string,
) {
  if (ctx.organizationId !== organizationId) {
    throw new ServiceError(
      "TENANT_MISMATCH",
      "Cannot initialize settings for another organization",
    );
  }

  enforceUserManagement(ctx);

  const org = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { logoUrl: true },
  });

  const settings = await initializeOrganizationSettingsRecord(
    prisma,
    organizationId,
    { logoUrl: org?.logoUrl ?? null },
  );

  return settings;
}

export async function ensureOrganizationSettings(ctx: TenantContext) {
  const existing = await prisma.organizationSettings.findUnique({
    where: { organizationId: ctx.organizationId },
  });

  if (existing) {
    return existing;
  }

  const org = await prisma.organization.findFirst({
    where: { id: ctx.organizationId },
    select: { logoUrl: true },
  });

  return initializeOrganizationSettingsRecord(prisma, ctx.organizationId, {
    logoUrl: org?.logoUrl ?? null,
  });
}

// ---------------------------------------------------------------------------
// Branch settings
// ---------------------------------------------------------------------------

export async function getBranchSettings(
  ctx: TenantContext,
  branchId: string,
) {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  await assertBranchInOrganization(ctx, branchId);

  try {
    await ensureBranchSettings(ctx, branchId);
  } catch (err) {
    if (!isSchemaDriftError(err)) {
      throw err;
    }
  }

  try {
    const [settings, config] = await Promise.all([
      prisma.branchSettings.findFirst({
        where: {
          branchId,
          organizationId: ctx.organizationId,
        },
      }),
      resolveBranchConfig(ctx, branchId),
    ]);

    if (!settings) {
      throw new BranchNotFoundError(branchId);
    }

    return buildBranchSettingsPayload(
      {
        ...settings,
        operationalSettings:
          (settings.operationalSettings as Record<string, unknown> | null) ??
          null,
      },
      config,
    );
  } catch (err) {
    if (isSchemaDriftError(err)) {
      const config = await resolveBranchConfig(ctx, branchId).catch(() => null);
      if (!config) {
        throw err;
      }

      const now = new Date();
      return buildBranchSettingsPayload(
        {
          id: "default",
          branchId,
          organizationId: ctx.organizationId,
          requiresApproval: config.requiresApproval,
          autoCheckoutHours: config.autoCheckoutHours,
          qrExpiryMinutes: config.qrExpiryMinutes,
          badgeTemplate: config.badgeTemplate,
          allowWalkIns: config.allowWalkIns,
          operationalSettings: null,
          createdAt: now,
          updatedAt: now,
        },
        config,
      );
    }
    throw err;
  }
}

export async function updateBranchSettings(
  ctx: TenantContext,
  branchId: string,
  input: UpdateBranchSettingsInput,
) {
  requirePermission(ctx, PERMISSIONS.BRANCH_MANAGE);

  const data = updateBranchSettingsSchema.parse(input);
  await assertBranchInOrganization(ctx, branchId);
  await ensureBranchSettings(ctx, branchId);

  const existing = await prisma.branchSettings.findUnique({
    where: { branchId },
    select: { operationalSettings: true },
  });

  const operationalPatch = data.operational;
  const columnRequiresApproval =
    data.requiresApproval ?? operationalPatch?.requireApproval;
  const columnAllowWalkIns =
    data.allowWalkIns ?? operationalPatch?.allowWalkIns;
  const columnQrExpiryMinutes =
    data.qrExpiryMinutes ??
    (operationalPatch?.qrExpiryHours !== undefined
      ? qrExpiryHoursToMinutes(operationalPatch.qrExpiryHours)
      : undefined);

  let operationalSettingsJson: Prisma.InputJsonValue | undefined;
  if (operationalPatch) {
    const jsonPatch = pickOperationalJsonOverrides(operationalPatch);
    const merged = mergeOperationalSettingsJson(
      existing?.operationalSettings ?? null,
      jsonPatch,
    );
    operationalSettingsJson = merged as Prisma.InputJsonValue;
  }

  const settings = await prisma.branchSettings.update({
    where: { branchId },
    data: {
      ...(columnRequiresApproval !== undefined
        ? { requiresApproval: columnRequiresApproval }
        : {}),
      ...(data.autoCheckoutHours !== undefined
        ? { autoCheckoutHours: data.autoCheckoutHours }
        : {}),
      ...(columnQrExpiryMinutes !== undefined
        ? { qrExpiryMinutes: columnQrExpiryMinutes }
        : {}),
      ...(data.badgeTemplate !== undefined
        ? { badgeTemplate: data.badgeTemplate }
        : {}),
      ...(columnAllowWalkIns !== undefined
        ? { allowWalkIns: columnAllowWalkIns }
        : {}),
      ...(operationalSettingsJson !== undefined
        ? { operationalSettings: operationalSettingsJson }
        : {}),
    },
  });

  if (
    columnRequiresApproval !== undefined ||
    data.autoCheckoutHours !== undefined
  ) {
    await prisma.branch.update({
      where: { id: branchId, organizationId: ctx.organizationId },
      data: {
        ...(columnRequiresApproval !== undefined
          ? { requiresApproval: columnRequiresApproval }
          : {}),
        ...(data.autoCheckoutHours !== undefined
          ? { autoCheckoutHours: data.autoCheckoutHours }
          : {}),
      },
    });
  }

  const config = await resolveBranchConfig(ctx, branchId);
  return buildBranchSettingsPayload(
    {
      ...settings,
      operationalSettings:
        (settings.operationalSettings as Record<string, unknown> | null) ?? null,
    },
    config,
  );
}

function isSchemaDriftError(err: unknown): boolean {
  return isPrismaKnownRequestError(err) && err.code === "P2022";
}

export async function initializeBranchSettings(
  ctx: TenantContext,
  branchId: string,
) {
  requirePermission(ctx, PERMISSIONS.BRANCH_MANAGE);

  const branch = await assertBranchInOrganization(ctx, branchId);

  return initializeBranchSettingsRecord(prisma, ctx.organizationId, branchId, {
    requiresApproval: branch.requiresApproval,
    autoCheckoutHours: branch.autoCheckoutHours,
  });
}

export async function ensureBranchSettings(
  ctx: TenantContext,
  branchId: string,
) {
  const existing = await prisma.branchSettings.findUnique({
    where: { branchId },
  });

  if (existing) {
    if (existing.organizationId !== ctx.organizationId) {
      throw new ServiceError("TENANT_MISMATCH", "Branch organization mismatch");
    }
    return existing;
  }

  const branch = await assertBranchInOrganization(ctx, branchId);

  return initializeBranchSettingsRecord(prisma, ctx.organizationId, branchId, {
    requiresApproval: branch.requiresApproval,
    autoCheckoutHours: branch.autoCheckoutHours,
  });
}

async function assertBranchInOrganization(
  ctx: TenantContext,
  branchId: string,
) {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      organizationId: ctx.organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      requiresApproval: true,
      autoCheckoutHours: true,
    },
  });

  if (!branch) {
    throw new BranchNotFoundError(branchId);
  }

  return branch;
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

export async function getFeatureFlag(ctx: TenantContext, key: FeatureFlagKey) {
  enforceUserManagement(ctx);

  const flag = await prisma.featureFlag.findUnique({
    where: {
      organizationId_key: {
        organizationId: ctx.organizationId,
        key,
      },
    },
  });

  return {
    key,
    value: flag?.value ?? false,
    description: flag?.description ?? null,
    exists: Boolean(flag),
  };
}

export async function setFeatureFlag(
  ctx: TenantContext,
  key: FeatureFlagKey,
  value: SetFeatureFlagInput["value"],
  description?: string,
) {
  enforceUserManagement(ctx);

  const parsed = setFeatureFlagSchema.parse({ key, value, description });

  return prisma.featureFlag.upsert({
    where: {
      organizationId_key: {
        organizationId: ctx.organizationId,
        key: parsed.key,
      },
    },
    create: {
      organizationId: ctx.organizationId,
      key: parsed.key,
      value: parsed.value as Prisma.InputJsonValue,
      description: parsed.description ?? null,
    },
    update: {
      value: parsed.value as Prisma.InputJsonValue,
      ...(parsed.description !== undefined
        ? { description: parsed.description }
        : {}),
    },
  });
}

export async function isFeatureEnabled(
  ctx: TenantContext,
  key: FeatureFlagKey,
): Promise<boolean> {
  return isFeatureEnabledForOrg(ctx.organizationId, key);
}
