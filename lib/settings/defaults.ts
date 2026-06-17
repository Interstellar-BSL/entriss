import { BadgeTemplateType } from "@prisma/client";

export { DEFAULT_BRANCH_OPERATIONAL_SETTINGS } from "./branch-operational";

export const DEFAULT_ORGANIZATION_SETTINGS = {
  primaryColor: "#2563EB",
  secondaryColor: "#1E40AF",
  welcomeMessage: null as string | null,
  themeMode: "system" as const,
  requiresApproval: false,
  allowWalkIns: true,
  capturePhoto: false,
  requireIDUpload: false,
  qrRequired: true,
  manualOverrideAllowed: true,
  emailEnabled: true,
  smsEnabled: false,
} as const;

export const DEFAULT_BRANCH_SETTINGS = {
  requiresApproval: false,
  autoCheckoutHours: null as number | null,
  qrExpiryMinutes: 1440,
  badgeTemplate: BadgeTemplateType.standard,
  allowWalkIns: true,
} as const;
