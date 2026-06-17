import { DEFAULT_ORGANIZATION_SETTINGS } from "./defaults";

export interface NormalizedApprovalSettings {
  requireApproval: { enabled: boolean };
}

type OrganizationSettingsRow = {
  requiresApproval?: boolean | null;
};

export function normalizeApprovalSettings(
  settings: OrganizationSettingsRow | null | undefined,
): NormalizedApprovalSettings {
  const enabled =
    settings?.requiresApproval ?? DEFAULT_ORGANIZATION_SETTINGS.requiresApproval;

  return {
    requireApproval: { enabled },
  };
}

export function normalizeVisitorApprovalFields(
  settings: OrganizationSettingsRow | null | undefined,
): {
  requiresApproval: boolean;
} {
  return {
    requiresApproval: normalizeApprovalSettings(settings).requireApproval.enabled,
  };
}
