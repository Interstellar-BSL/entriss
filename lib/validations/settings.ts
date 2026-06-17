import { BadgeTemplateType } from "@prisma/client";
import { z } from "zod";

import { FEATURE_FLAGS } from "@/lib/settings/feature-flags";

import { ORG_THEME_MODES } from "@/lib/branding/types";

import { branchOperationalSettingsPatchSchema } from "./branch-operational-settings";

const hexColorSchema = z
  .string()
  .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color");

const logoUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value.length === 0 ||
      /^data:image\/(png|jpeg|jpg|webp);base64,/.test(value) ||
      (() => {
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      })(),
    "Logo must be a valid image URL or uploaded image",
  );

export const updateOrganizationSettingsSchema = z
  .object({
    branding: z
      .object({
        logoUrl: z.union([logoUrlSchema, z.null()]).optional(),
        primaryColor: hexColorSchema.optional(),
        secondaryColor: hexColorSchema.optional(),
        welcomeMessage: z.string().trim().max(500).nullable().optional(),
        themeMode: z.enum(ORG_THEME_MODES).optional(),
      })
      .optional(),
    visitor: z
      .object({
        requiresApproval: z.boolean().optional(),
        allowWalkIns: z.boolean().optional(),
        capturePhoto: z.boolean().optional(),
        requireIDUpload: z.boolean().optional(),
      })
      .optional(),
    checkIn: z
      .object({
        qrRequired: z.boolean().optional(),
        manualOverrideAllowed: z.boolean().optional(),
      })
      .optional(),
    notifications: z
      .object({
        emailEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
      })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one settings group must be provided",
  });

export const updateBranchSettingsSchema = z
  .object({
    requiresApproval: z.boolean().optional(),
    autoCheckoutHours: z.number().int().min(1).max(168).nullable().optional(),
    qrExpiryMinutes: z.number().int().min(15).max(10080).optional(),
    badgeTemplate: z.nativeEnum(BadgeTemplateType).optional(),
    allowWalkIns: z.boolean().optional(),
    operational: branchOperationalSettingsPatchSchema.optional(),
  })
  .refine(
    (value) =>
      Object.keys(value).filter((key) => key !== "operational").length > 0 ||
      value.operational !== undefined,
    {
      message: "At least one branch setting must be provided",
    },
  );

export const setFeatureFlagSchema = z.object({
  key: z.enum([
    FEATURE_FLAGS.ENABLE_SMS_NOTIFICATIONS,
    FEATURE_FLAGS.ENABLE_PHOTO_CAPTURE,
    FEATURE_FLAGS.ENABLE_PRE_REGISTRATION,
    FEATURE_FLAGS.ENABLE_VISITOR_BLACKLIST,
  ]),
  value: z.union([z.boolean(), z.string(), z.record(z.string(), z.unknown())]),
  description: z.string().trim().max(500).optional(),
});

export type UpdateOrganizationSettingsInput = z.infer<
  typeof updateOrganizationSettingsSchema
>;
export type UpdateBranchSettingsInput = z.infer<
  typeof updateBranchSettingsSchema
>;
export type SetFeatureFlagInput = z.infer<typeof setFeatureFlagSchema>;
