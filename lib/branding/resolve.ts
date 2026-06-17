import { DEFAULT_ORGANIZATION_SETTINGS } from "@/lib/settings/defaults";
import type { BrandingConfig } from "@/lib/settings/types";

import { darkenHexColor, sanitizeHexColor } from "./colors";
import {
  ORG_THEME_MODES,
  type OrgBrandingInput,
  type OrgThemeMode,
  type ResolvedOrgBranding,
} from "./types";

export function normalizeOrgThemeMode(
  value: OrgThemeMode | string | null | undefined,
): OrgThemeMode {
  if (value && ORG_THEME_MODES.includes(value as OrgThemeMode)) {
    return value as OrgThemeMode;
  }

  return "system";
}

export function resolveOrgBranding(
  input: OrgBrandingInput | BrandingConfig | null | undefined,
  options?: {
    organizationId?: string | null;
    organizationName?: string | null;
  },
): ResolvedOrgBranding {
  const defaults = DEFAULT_ORGANIZATION_SETTINGS;
  const primaryColor = sanitizeHexColor(input?.primaryColor, defaults.primaryColor);
  const secondaryColor = sanitizeHexColor(
    input?.secondaryColor,
    defaults.secondaryColor,
  );
  const themeMode = normalizeOrgThemeMode(
    "themeMode" in (input ?? {}) ? (input as OrgBrandingInput).themeMode : "system",
  );

  const logoUrl = input?.logoUrl?.trim() ? input.logoUrl.trim() : null;
  const welcomeMessage = input?.welcomeMessage?.trim()
    ? input.welcomeMessage.trim()
    : null;

  const isCustomized =
    Boolean(logoUrl) ||
    primaryColor !== defaults.primaryColor ||
    secondaryColor !== defaults.secondaryColor ||
    Boolean(welcomeMessage) ||
    themeMode !== "system";

  return {
    organizationId: options?.organizationId ?? null,
    organizationName: options?.organizationName ?? null,
    logoUrl,
    primaryColor,
    secondaryColor,
    primaryColorHover: darkenHexColor(primaryColor),
    welcomeMessage,
    themeMode,
    isCustomized,
  };
}

export function getDefaultOrgBranding(
  options?: {
    organizationId?: string | null;
    organizationName?: string | null;
  },
): ResolvedOrgBranding {
  return resolveOrgBranding(null, options);
}
