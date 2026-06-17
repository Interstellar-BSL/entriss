import { z } from "zod";

const organizationSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase letters, numbers, and hyphens only",
  );

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(255),
  slug: organizationSlugSchema.optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
