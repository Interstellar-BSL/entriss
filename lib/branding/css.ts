import type { ResolvedOrgBranding } from "./types";

export function brandingToCssVariables(
  branding: ResolvedOrgBranding,
): Record<string, string> {
  return {
    "--brand-primary": branding.primaryColor,
    "--brand-secondary": branding.secondaryColor,
    "--brand-primary-hover": branding.primaryColorHover,
  };
}

export function applyOrgBrandingToDocument(branding: ResolvedOrgBranding) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  for (const [key, value] of Object.entries(brandingToCssVariables(branding))) {
    root.style.setProperty(key, value);
  }

  root.dataset.orgTheme = branding.themeMode;

  if (branding.organizationId) {
    root.dataset.orgId = branding.organizationId;
  } else {
    delete root.dataset.orgId;
  }
}

export function clearOrgBrandingFromDocument() {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const keys = ["--brand-primary", "--brand-secondary", "--brand-primary-hover"];

  for (const key of keys) {
    root.style.removeProperty(key);
  }

  delete root.dataset.orgTheme;
  delete root.dataset.orgId;
}
