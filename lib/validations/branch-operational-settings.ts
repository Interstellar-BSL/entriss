import { z } from "zod";

const visitHourSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be a valid time in HH:mm format");

function visitHoursRefine(
  value: { allowedVisitStartHour?: string; allowedVisitEndHour?: string },
  ctx: z.RefinementCtx,
) {
  const { allowedVisitStartHour, allowedVisitEndHour } = value;
  if (!allowedVisitStartHour || !allowedVisitEndHour) {
    return;
  }

  if (allowedVisitStartHour >= allowedVisitEndHour) {
    ctx.addIssue({
      code: "custom",
      message: "allowedVisitEndHour must be after allowedVisitStartHour",
      path: ["allowedVisitEndHour"],
    });
  }
}

export const branchOperationalSettingsSchema = z
  .object({
    requireApproval: z.boolean(),
    allowWalkIns: z.boolean(),
    kioskEnabled: z.boolean(),
    autoCheckInApprovedVisitors: z.boolean(),
    requireVisitorPhoto: z.boolean(),
    requireVisitorDocuments: z.boolean(),
    badgePrintingEnabled: z.boolean(),
    qrExpiryHours: z.number().int().min(1).max(168),
    allowedVisitStartHour: visitHourSchema,
    allowedVisitEndHour: visitHourSchema,
  })
  .superRefine(visitHoursRefine);

export const branchOperationalSettingsPatchSchema = z
  .object({
    requireApproval: z.boolean().optional(),
    allowWalkIns: z.boolean().optional(),
    kioskEnabled: z.boolean().optional(),
    autoCheckInApprovedVisitors: z.boolean().optional(),
    requireVisitorPhoto: z.boolean().optional(),
    requireVisitorDocuments: z.boolean().optional(),
    badgePrintingEnabled: z.boolean().optional(),
    qrExpiryHours: z.number().int().min(1).max(168).optional(),
    allowedVisitStartHour: visitHourSchema.optional(),
    allowedVisitEndHour: visitHourSchema.optional(),
  })
  .superRefine(visitHoursRefine)
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one operational setting must be provided",
  });

export type BranchOperationalSettingsInput = z.infer<
  typeof branchOperationalSettingsSchema
>;
export type BranchOperationalSettingsPatchInput = z.infer<
  typeof branchOperationalSettingsPatchSchema
>;
