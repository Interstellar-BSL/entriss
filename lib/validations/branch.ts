import { z } from "zod";

import { branchTimezoneSchema } from "@/lib/validations/branch-timezone";

const branchSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase letters, numbers, and hyphens only",
  );

const optionalBranchCodeSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .trim()
    .max(20)
    .transform((code) => code.toUpperCase())
    .optional(),
);

const optionalDescriptionSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(500).optional(),
);

export const createBranchSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  code: optionalBranchCodeSchema,
  slug: branchSlugSchema.optional(),
  description: optionalDescriptionSchema,
  timezone: branchTimezoneSchema.optional(),
});

export const updateBranchSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100)
      .optional(),
    code: z
      .string()
      .trim()
      .max(20)
      .transform((value) => value.toUpperCase())
      .nullable()
      .optional(),
    description: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
    timezone: branchTimezoneSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
