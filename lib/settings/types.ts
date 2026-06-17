import type { BadgeTemplateType } from "@prisma/client";

import type { BranchOperationalSettings } from "./branch-operational";
import type { FeatureFlagKey } from "./feature-flags";

import type { OrgThemeMode } from "@/lib/branding/types";

export interface BrandingConfig {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  welcomeMessage: string | null;
  themeMode: OrgThemeMode;
}

export interface VisitorConfig {
  requiresApproval: boolean;
  allowWalkIns: boolean;
  capturePhoto: boolean;
  requireIDUpload: boolean;
}

export interface CheckInConfig {
  qrRequired: boolean;
  manualOverrideAllowed: boolean;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface ResolvedOrganizationConfig {
  organizationId: string;
  branding: BrandingConfig;
  visitor: VisitorConfig;
  checkIn: CheckInConfig;
  notifications: NotificationConfig;
  features: Record<FeatureFlagKey | string, boolean | string | unknown>;
}

export interface ResolvedBranchConfig extends ResolvedOrganizationConfig {
  branchId: string;
  requiresApproval: boolean;
  autoCheckoutHours: number | null;
  qrExpiryMinutes: number;
  badgeTemplate: BadgeTemplateType;
  allowWalkIns: boolean;
  /** Normalized branch operational policies (always fully populated). */
  operational: BranchOperationalSettings;
}
