export const ORG_THEME_MODES = ["system", "light", "dark", "custom"] as const;

export type OrgThemeMode = (typeof ORG_THEME_MODES)[number];

export interface OrgBrandingInput {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  welcomeMessage?: string | null;
  themeMode?: OrgThemeMode | string | null;
}

export interface ResolvedOrgBranding {
  organizationId: string | null;
  organizationName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  primaryColorHover: string;
  welcomeMessage: string | null;
  themeMode: OrgThemeMode;
  isCustomized: boolean;
}
