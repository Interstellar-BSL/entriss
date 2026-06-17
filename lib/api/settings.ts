import { apiFetch, ApiError } from "@/lib/api/client";
import {
  buildFallbackBranchSettingsResponse,
  buildFallbackOrganizationSettingsResponse,
  isBranchSettingsResponse,
  isOrganizationSettingsResponse,
} from "@/lib/api/settings-fallback";
import type { NormalizedApprovalSettings } from "@/lib/settings/approval-normalize";
import type { FeatureFlagKey } from "@/lib/settings/feature-flags";
import type {
  ResolvedBranchConfig,
  ResolvedOrganizationConfig,
} from "@/lib/settings/types";
import type {
  SetFeatureFlagInput,
  UpdateBranchSettingsInput,
  UpdateOrganizationSettingsInput,
} from "@/lib/validations/settings";
import type { BadgeTemplateType } from "@/app/generated/prisma/enums";

export type { NormalizedApprovalSettings };

export interface OrganizationSettingsRecord {
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
  createdAt: string;
  updatedAt: string;
}

export interface BranchSettingsRecord {
  id: string;
  branchId: string;
  organizationId: string;
  requiresApproval: boolean;
  autoCheckoutHours: number | null;
  qrExpiryMinutes: number;
  badgeTemplate: BadgeTemplateType;
  allowWalkIns: boolean;
  operationalSettings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettingsResponse {
  settings: OrganizationSettingsRecord;
  config: ResolvedOrganizationConfig;
  approval: NormalizedApprovalSettings;
}

export interface BranchSettingsResponse {
  settings: BranchSettingsRecord;
  config: ResolvedBranchConfig;
  approval: NormalizedApprovalSettings;
}

export interface FeatureFlagResponse {
  key: FeatureFlagKey;
  value: boolean | string | Record<string, unknown>;
  description: string | null;
  exists: boolean;
}

async function fetchOrganizationSettings(): Promise<OrganizationSettingsResponse> {
  const result = await apiFetch<OrganizationSettingsResponse>(
    "/api/v1/settings/organization",
  );

  if (!isOrganizationSettingsResponse(result)) {
    return buildFallbackOrganizationSettingsResponse();
  }

  return result;
}

export function getOrganizationSettings() {
  return fetchOrganizationSettings().catch((err) => {
    if (
      err instanceof ApiError &&
      (err.code === "INVALID_RESPONSE" ||
        err.code === "SCHEMA_OUT_OF_DATE" ||
        err.code === "DATABASE_ERROR")
    ) {
      return buildFallbackOrganizationSettingsResponse();
    }
    throw err;
  });
}

export function updateOrganizationSettings(
  input: UpdateOrganizationSettingsInput,
) {
  return apiFetch<OrganizationSettingsResponse>(
    "/api/v1/settings/organization",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

async function fetchBranchSettings(
  branchId: string,
): Promise<BranchSettingsResponse> {
  const result = await apiFetch<BranchSettingsResponse>(
    `/api/v1/settings/branches/${branchId}`,
  );

  if (!isBranchSettingsResponse(result)) {
    return buildFallbackBranchSettingsResponse(branchId);
  }

  return result;
}

export function getBranchSettings(branchId: string) {
  return fetchBranchSettings(branchId).catch((err) => {
    if (
      err instanceof ApiError &&
      (err.code === "INVALID_RESPONSE" ||
        err.code === "SCHEMA_OUT_OF_DATE" ||
        err.code === "DATABASE_ERROR" ||
        err.code === "FORBIDDEN")
    ) {
      return buildFallbackBranchSettingsResponse(branchId);
    }
    throw err;
  });
}

export function updateBranchSettings(
  branchId: string,
  input: UpdateBranchSettingsInput,
) {
  return apiFetch<BranchSettingsResponse>(
    `/api/v1/settings/branches/${branchId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function getFeatureFlag(key: FeatureFlagKey) {
  return apiFetch<FeatureFlagResponse>(
    `/api/v1/settings/feature-flags/${key}`,
  );
}

export function setFeatureFlag(input: SetFeatureFlagInput) {
  return apiFetch<{ flag: { key: string; value: unknown } }>(
    `/api/v1/settings/feature-flags/${input.key}`,
    {
      method: "PUT",
      body: JSON.stringify({
        value: input.value,
        description: input.description,
      }),
    },
  );
}
